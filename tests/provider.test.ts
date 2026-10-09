import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAIProvider, ConfigurationError, getProviderConfigDiagnostics } from '../src/lib/ai/provider';
import { VertexProvider } from '../src/lib/ai/providers/vertex';
import { AnthropicProvider } from '../src/lib/ai/providers/anthropic';

describe('AI Provider Factory & Selection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should default to VertexProvider when AI_PROVIDER is unset', () => {
    delete process.env.AI_PROVIDER;
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(VertexProvider);
    expect(provider.id).toBe('vertex');
    expect(provider.displayName).toBe('Vertex AI');
  });

  it('should return VertexProvider when AI_PROVIDER=vertex', () => {
    process.env.AI_PROVIDER = 'vertex';
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(VertexProvider);
  });

  it('should return AnthropicProvider when AI_PROVIDER=anthropic', () => {
    process.env.AI_PROVIDER = 'anthropic';
    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.id).toBe('anthropic');
    expect(provider.displayName).toBe('Anthropic Claude');
  });

  it('should support provider override argument in factory call', () => {
    process.env.AI_PROVIDER = 'vertex';
    const provider = getAIProvider('anthropic');
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('should throw ConfigurationError on unknown provider', () => {
    expect(() => getAIProvider('unsupported-provider')).toThrowError(ConfigurationError);
    expect(() => getAIProvider('unsupported-provider')).toThrowError(/Unsupported AI provider/);
  });

  it('should throw helpful error when Vertex credentials are missing', async () => {
    delete process.env.VERTEX_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const provider = new VertexProvider();
    await expect(
      provider.analyzeDocument({
        question: 'Test question',
        document: {
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          pageCount: 1,
          pages: [{ pageNumber: 1, text: 'Test content' }],
          fullText: 'Test content',
        },
      })
    ).rejects.toThrowError(/Vertex API key is not configured/);
  });

  it('should throw helpful error when Anthropic credentials are missing without faking Claude calls', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const provider = new AnthropicProvider();
    await expect(
      provider.analyzeDocument({
        question: 'Test question',
        document: {
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          pageCount: 1,
          pages: [{ pageNumber: 1, text: 'Test content' }],
          fullText: 'Test content',
        },
      })
    ).rejects.toThrowError(/Anthropic provider is not configured yet/);
  });

  it('should return provider diagnostics with non-secret metadata', () => {
    process.env.AI_PROVIDER = 'vertex';
    process.env.VERTEX_MODEL = 'gemini-2.5-flash';
    const diagnostics = getProviderConfigDiagnostics();

    expect(diagnostics.activeProviderId).toBe('vertex');
    expect(diagnostics.activeProviderName).toBe('Vertex AI');
    expect(diagnostics.configuredVertexModel).toBe('gemini-2.5-flash');
    expect(typeof diagnostics.isVertexConfigured).toBe('boolean');
    expect(typeof diagnostics.isAnthropicConfigured).toBe('boolean');
  });
});
