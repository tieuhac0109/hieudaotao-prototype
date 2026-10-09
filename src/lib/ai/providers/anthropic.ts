import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AnalyzeDocumentInput, RawModelOutput } from '../types';
import { ACADEMIC_POLICY_SYSTEM_PROMPT } from '../system-prompt';
import { formatDocumentForPrompt } from '../../documents/pdf';
import { parseAndValidateModelOutput } from '../../validation/input';
import { ConfigurationError, AIProviderError } from '../errors';

/**
 * Anthropic Claude Provider Adapter.
 *
 * Future-ready adapter: Architecturally implemented for future Claude activation.
 * Requires both ANTHROPIC_API_KEY and ANTHROPIC_MODEL to be explicitly configured.
 * Does NOT guess or hard-code a default Claude model.
 */
export class AnthropicProvider implements AIProvider {
  public readonly id = 'anthropic';
  public readonly displayName = 'Anthropic Claude';

  private resolveApiKey(): string {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      throw new ConfigurationError(
        'Anthropic provider is not configured yet. Set ANTHROPIC_API_KEY in your environment variables to enable Anthropic Claude.'
      );
    }
    return apiKey.trim();
  }

  private resolveModel(): string {
    const model = process.env.ANTHROPIC_MODEL;
    if (!model || !model.trim()) {
      throw new ConfigurationError(
        'Anthropic provider requires ANTHROPIC_MODEL to be set to an active model available to your Anthropic account.'
      );
    }
    return model.trim();
  }

  private createClient(): Anthropic {
    const apiKey = this.resolveApiKey();

    return new Anthropic({
      apiKey: apiKey,
    });
  }

  public async analyzeDocument(
    input: AnalyzeDocumentInput
  ): Promise<RawModelOutput & { provider: string; model: string }> {
    const anthropic = this.createClient();
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
      throw new AIProviderError(`Anthropic generation request failed: ${msg}`, err);
    }

    const textContent = messageResponse.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    if (!textContent || !textContent.trim()) {
      throw new AIProviderError('Anthropic Claude returned an empty response.');
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
