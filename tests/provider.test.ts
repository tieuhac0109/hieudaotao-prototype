import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAIProvider,
  ConfigurationError,
  getProviderConfigDiagnostics,
} from '../src/lib/ai/provider';
import { VertexProvider } from '../src/lib/ai/providers/vertex';
import { AnthropicProvider } from '../src/lib/ai/providers/anthropic';

describe('AI Provider Factory & Configuration Diagnostics', () => {
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

  it('should throw ConfigurationError on unknown provider', () => {
    expect(() => getAIProvider('unsupported-provider')).toThrowError(ConfigurationError);
    expect(() => getAIProvider('unsupported-provider')).toThrowError(/Unsupported AI provider/);
  });

  it('should throw ConfigurationError when Vertex API key is missing', async () => {
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
    ).rejects.toThrowError(ConfigurationError);
  });

  it('should throw ConfigurationError when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_MODEL = 'claude-3-7-sonnet-20250219';

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
    ).rejects.toThrowError(ConfigurationError);

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
    ).rejects.toThrowError(/Set ANTHROPIC_API_KEY/);
  });

  it('should throw ConfigurationError when ANTHROPIC_MODEL is missing', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    delete process.env.ANTHROPIC_MODEL;

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
    ).rejects.toThrowError(ConfigurationError);

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
    ).rejects.toThrowError(/ANTHROPIC_MODEL to be set/);
  });

  it('should honestly report liveValidated=true for Vertex and liveValidated=false for Anthropic', () => {
    delete process.env.VERTEX_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;

    process.env.AI_PROVIDER = 'vertex';
    const diagnostics = getProviderConfigDiagnostics();

    expect(diagnostics.activeProviderId).toBe('vertex');
    expect(diagnostics.isVertexConfigured).toBe(false);
    expect(diagnostics.isAnthropicConfigured).toBe(false);

    // Vertex details
    expect(diagnostics.providers.vertex.adapterImplemented).toBe(true);
    expect(diagnostics.providers.vertex.configured).toBe(false);
    expect(diagnostics.providers.vertex.liveValidated).toBe(true); // Recorded milestone

    // Anthropic details
    expect(diagnostics.providers.anthropic.adapterImplemented).toBe(true);
    expect(diagnostics.providers.anthropic.configured).toBe(false);
    expect(diagnostics.providers.anthropic.liveValidated).toBe(false); // Unvalidated
  });

  it('should accurately reflect runtime configured state when environment variables are set', () => {
    process.env.VERTEX_API_KEY = 'test-vertex-key';
    process.env.VERTEX_MODEL = 'gemini-2.5-flash';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';

    const diagnostics = getProviderConfigDiagnostics();
    expect(diagnostics.isVertexConfigured).toBe(true);
    expect(diagnostics.providers.vertex.configured).toBe(true);
    expect(diagnostics.providers.vertex.liveValidated).toBe(true);
    expect(diagnostics.providers.vertex.model).toBe('gemini-2.5-flash');

    expect(diagnostics.isAnthropicConfigured).toBe(true);
    expect(diagnostics.providers.anthropic.configured).toBe(true);
    expect(diagnostics.providers.anthropic.liveValidated).toBe(false);
    expect(diagnostics.providers.anthropic.model).toBe('claude-3-5-sonnet-20241022');
  });
});
