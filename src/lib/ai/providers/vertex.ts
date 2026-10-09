import { GoogleGenAI } from '@google/genai';
import { AIProvider, AnalyzeDocumentInput, RawModelOutput } from '../types';
import { ACADEMIC_POLICY_SYSTEM_PROMPT } from '../system-prompt';
import { formatDocumentForPrompt } from '../../documents/pdf';
import { parseAndValidateModelOutput } from '../../validation/input';
import { ConfigurationError, AIProviderError } from '../errors';

/**
 * Vertex AI / Gemini Provider Adapter.
 *
 * Current Authentication Mode:
 * Supports Vertex AI Express Mode API-key authentication via @google/genai SDK.
 *
 * (Architecture Note: Standard Google Cloud project/service-account authentication
 * can later be added inside this adapter if required by infrastructure).
 */
export class VertexProvider implements AIProvider {
  public readonly id = 'vertex';
  public readonly displayName = 'Vertex AI';

  private resolveApiKey(): string {
    const apiKey =
      process.env.VERTEX_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      throw new ConfigurationError(
        'Vertex API key is not configured. Please set VERTEX_API_KEY (or GEMINI_API_KEY) in your environment variables.'
      );
    }

    return apiKey.trim();
  }

  private resolveModel(): string {
    const model = process.env.VERTEX_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    return model.trim();
  }

  private createClient(): GoogleGenAI {
    const apiKey = this.resolveApiKey();

    // Initialize Google Gen AI in Vertex AI Express Mode using API key
    return new GoogleGenAI({
      vertexai: true,
      apiKey: apiKey,
    });
  }

  public async analyzeDocument(
    input: AnalyzeDocumentInput
  ): Promise<RawModelOutput & { provider: string; model: string }> {
    const ai = this.createClient();
    const modelName = this.resolveModel();

    const formattedDoc = formatDocumentForPrompt(input.document);

    const userPrompt = `DOCUMENT CONTENT:
${formattedDoc}

USER QUESTION:
${input.question}

INSTRUCTIONS:
Analyze the document above and answer the question according to the institutional policy intelligence guidelines.
Ensure that EVERY substantive claim is accompanied by exact verbatim quoted passages with accurate 1-based page numbers matching the [PAGE X] headers.
Return ONLY valid JSON matching the required schema.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        config: {
          systemInstruction: ACADEMIC_POLICY_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.1, // Low temperature for factual precision and grounded citations
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new AIProviderError(`Vertex AI generation request failed: ${msg}`, err);
    }

    const rawText = response?.text;
    if (!rawText) {
      throw new AIProviderError('Vertex AI returned an empty response.');
    }

    const parsed = parseAndValidateModelOutput(rawText);

    return {
      provider: this.id,
      model: modelName,
      answer: parsed.answer,
      answerability: parsed.answerability,
      evidence: parsed.evidence,
      warnings: parsed.warnings,
    };
  }
}
