import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AnalyzeDocumentInput, RawModelOutput } from '../types';
import { ACADEMIC_POLICY_SYSTEM_PROMPT } from '../system-prompt';
import { formatDocumentForPrompt } from '../../documents/pdf';
import { parseAndValidateModelOutput } from '../../validation/input';

export class AnthropicProvider implements AIProvider {
  public readonly id = 'anthropic';
  public readonly displayName = 'Anthropic Claude';
  public readonly defaultModel = 'claude-3-7-sonnet-20250219';

  private resolveApiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY;
  }

  private resolveModel(requestedModel?: string): string {
    return (
      requestedModel ||
      process.env.ANTHROPIC_MODEL ||
      this.defaultModel
    );
  }

  private createClient(): Anthropic {
    const apiKey = this.resolveApiKey();

    if (!apiKey) {
      throw new Error(
        'Anthropic provider is not configured yet. Set ANTHROPIC_API_KEY in your environment variables to enable Anthropic Claude.'
      );
    }

    return new Anthropic({
      apiKey: apiKey,
    });
  }

  public async analyzeDocument(
    input: AnalyzeDocumentInput
  ): Promise<RawModelOutput & { provider: string; model: string }> {
    const anthropic = this.createClient();
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

    let messageResponse;
    try {
      messageResponse = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4096,
        system: ACADEMIC_POLICY_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Anthropic generation request failed: ${msg}`);
    }

    const textContent = messageResponse.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    if (!textContent) {
      throw new Error('Anthropic Claude returned an empty response.');
    }

    const parsed = parseAndValidateModelOutput(textContent);

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
