import { GoogleGenAI } from '@google/genai';
import { AIProvider, AnalyzeDocumentInput, RawModelOutput } from '../types';
import { ACADEMIC_POLICY_SYSTEM_PROMPT } from '../system-prompt';
import { formatDocumentForPrompt } from '../../documents/pdf';
import { parseAndValidateModelOutput } from '../../validation/input';

export class VertexProvider implements AIProvider {
  public readonly id = 'vertex';
  public readonly displayName = 'Vertex AI';
  public readonly defaultModel = 'gemini-2.5-flash';

  private resolveApiKey(): string | undefined {
    return (
      process.env.VERTEX_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY
    );
  }

  private resolveModel(requestedModel?: string): string {
    return (
      requestedModel ||
      process.env.VERTEX_MODEL ||
      process.env.GEMINI_MODEL ||
      this.defaultModel
    );
  }

  private createClient(): GoogleGenAI {
    const apiKey = this.resolveApiKey();

    if (!apiKey) {
      throw new Error(
        'Vertex API key is not configured. Please set VERTEX_API_KEY (or GEMINI_API_KEY) in your environment variables.'
      );
    }

    // Initialize Google Gen AI with Vertex AI Express Mode API key
    return new GoogleGenAI({
      vertexai: true,
      apiKey: apiKey,
    });
  }

  public async analyzeDocument(
    input: AnalyzeDocumentInput
  ): Promise<RawModelOutput & { provider: string; model: string }> {
    const ai = this.createClient();
    const modelName = this.resolveModel(input.model);

    const formattedDoc = formatDocumentForPrompt(input.document);

    const userPrompt = `DOCUMENT CONTENT:
${formattedDoc}

USER QUESTION:
${input.question}

INSTRUCTIONS:
Analyze the document above and answer the question according to the institutional policy intelligence guidelines.
Ensure that EVERY claim is accompanied by exact verbatim quoted passages with accurate 1-based page numbers matching the [PAGE X] headers.
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
          temperature: 0.1, // Low temperature for high factual precision and strict grounding
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Vertex AI generation request failed: ${msg}`);
    }

    const rawText = response.text;
    if (!rawText) {
      throw new Error('Vertex AI returned an empty response.');
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
