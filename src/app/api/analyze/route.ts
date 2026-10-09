import { NextRequest, NextResponse } from 'next/server';
import { extractPdfDocument, PdfProcessingError } from '@/lib/documents/pdf';
import {
  getAIProvider,
  ConfigurationError,
  AIProviderError,
  ModelOutputParseError,
} from '@/lib/ai/provider';
import { verifyEvidenceList } from '@/lib/verification/evidence';
import { QuestionSchema } from '@/lib/validation/input';
import { AnalyzeDocumentResult } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Invalid Content-Type. Request must be multipart/form-data with file and question.', code: 'INVALID_CONTENT_TYPE' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const questionRaw = formData.get('question');

    // 1. Validate question
    const questionValidation = QuestionSchema.safeParse(questionRaw);
    if (!questionValidation.success) {
      const errorMsg = questionValidation.error.issues[0]?.message || 'Invalid question format.';
      return NextResponse.json({ error: errorMsg, code: 'INVALID_QUESTION' }, { status: 400 });
    }
    const question = questionValidation.data;

    // 2. Validate file presence
    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No PDF file uploaded. Please select an academic regulation PDF.', code: 'MISSING_FILE' },
        { status: 400 }
      );
    }

    const filename = file.name || 'document.pdf';
    const mimeType = file.type || 'application/pdf';

    // 3. Convert to buffer and extract document pages
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const docContent = await extractPdfDocument(buffer, filename, mimeType);

    // 4. Select AI Provider via Provider Factory (Model is determined strictly server-side)
    const provider = getAIProvider();

    // 5. Call Provider to analyze document with grounded instructions
    const modelResult = await provider.analyzeDocument({
      question,
      document: docContent,
    });

    // 6. Perform server-side conservative evidence quotation verification
    const verifiedEvidence = verifyEvidenceList(modelResult.evidence, docContent.pages);

    const processingTimeMs = Date.now() - startTime;

    // 7. Assemble final transparent result
    const result: AnalyzeDocumentResult = {
      provider: modelResult.provider,
      model: modelResult.model,
      answer: modelResult.answer,
      answerability: modelResult.answerability,
      evidence: verifiedEvidence,
      warnings: modelResult.warnings,
      metadata: {
        pageCount: docContent.pageCount,
        processingTimeMs,
        model: modelResult.model,
        provider: modelResult.provider,
      },
    };

    // Safe operational audit logging (NO secrets, NO full documents logged)
    console.log(
      JSON.stringify({
        audit: 'HDT_ANALYZE_SUCCESS',
        requestId,
        provider: result.provider,
        model: result.model,
        pageCount: docContent.pageCount,
        fileSizeBytes: buffer.length,
        answerability: result.answerability,
        evidenceCount: result.evidence.length,
        verifiedCount: result.evidence.filter((e) => e.verified).length,
        processingTimeMs,
      })
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const processingTimeMs = Date.now() - startTime;

    if (err instanceof PdfProcessingError) {
      console.warn(`[HDT_ANALYZE_WARN] req=${requestId} code=${err.code} time=${processingTimeMs}ms`);
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }

    if (err instanceof ConfigurationError) {
      console.error(`[HDT_ANALYZE_CONFIG_ERR] req=${requestId} code=PROVIDER_NOT_CONFIGURED time=${processingTimeMs}ms`);
      return NextResponse.json(
        { error: 'The configured AI provider is unavailable.', code: 'PROVIDER_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    if (err instanceof AIProviderError) {
      console.error(`[HDT_ANALYZE_PROVIDER_ERR] req=${requestId} code=AI_PROVIDER_ERROR time=${processingTimeMs}ms`);
      return NextResponse.json(
        { error: 'AI provider request failed. Please try again.', code: 'AI_PROVIDER_ERROR' },
        { status: 502 }
      );
    }

    if (err instanceof ModelOutputParseError) {
      console.error(`[HDT_ANALYZE_PARSE_ERR] req=${requestId} code=MODEL_OUTPUT_INVALID time=${processingTimeMs}ms`);
      return NextResponse.json(
        { error: 'The model response could not be processed.', code: 'MODEL_OUTPUT_INVALID' },
        { status: 502 }
      );
    }

    console.error(`[HDT_ANALYZE_ERR] req=${requestId} code=INTERNAL_ERROR time=${processingTimeMs}ms`);

    return NextResponse.json(
      {
        error: 'An unexpected error occurred during document analysis.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
