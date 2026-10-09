import { NextRequest, NextResponse } from 'next/server';
import { extractPdfDocument, PdfProcessingError } from '@/lib/documents/pdf';
import { getAIProvider, ConfigurationError } from '@/lib/ai/provider';
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
        { error: 'Invalid Content-Type. Request must be multipart/form-data with file and question.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const questionRaw = formData.get('question');
    const modelOverride = formData.get('model');

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

    // 4. Select AI Provider via Provider Factory
    const provider = getAIProvider();

    // 5. Call Provider to analyze document with grounded instructions
    const modelResult = await provider.analyzeDocument({
      question,
      document: docContent,
      model: typeof modelOverride === 'string' && modelOverride.trim() ? modelOverride.trim() : undefined,
    });

    // 6. Perform server-side evidence quotation verification
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
      console.warn(`[HDT_ANALYZE_WARN] req=${requestId} code=${err.code} msg=${err.message}`);
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }

    if (err instanceof ConfigurationError) {
      console.error(`[HDT_ANALYZE_CONFIG_ERR] req=${requestId} msg=${err.message}`);
      return NextResponse.json({ error: err.message, code: err.code }, { status: 503 });
    }

    const message = err instanceof Error ? err.message : 'An unexpected error occurred during document analysis.';
    console.error(`[HDT_ANALYZE_ERR] req=${requestId} time=${processingTimeMs}ms error=${message}`);

    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_ERROR',
        hint: 'Verify that your AI provider API key is set and the PDF contains selectable text.',
      },
      { status: 500 }
    );
  }
}
