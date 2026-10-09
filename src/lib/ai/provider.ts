import { AIProvider } from './types';
import { VertexProvider } from './providers/vertex';
import { AnthropicProvider } from './providers/anthropic';
import { ConfigurationError } from './errors';

export * from './errors';

/**
 * Factory to retrieve the active AI Provider based on environment configuration or explicit ID.
 * Defaults to 'vertex' (Google Vertex AI / Gemini).
 */
export function getAIProvider(providerId?: string): AIProvider {
  const selected = (providerId || process.env.AI_PROVIDER || 'vertex').toLowerCase().trim();

  switch (selected) {
    case 'vertex':
    case 'google':
    case 'gemini':
      return new VertexProvider();

    case 'anthropic':
    case 'claude':
      return new AnthropicProvider();

    default:
      throw new ConfigurationError(
        `Unsupported AI provider: '${selected}'. Supported providers are: 'vertex', 'anthropic'. Please check your AI_PROVIDER environment variable.`
      );
  }
}

/**
 * Returns non-secret diagnostics about provider configuration for transparency.
 * Honestly distinguishes adapter implementation from runtime configuration and recorded live validation.
 */
export function getProviderConfigDiagnostics(): {
  activeProviderId: string;
  activeProviderName: string;
  isVertexConfigured: boolean;
  isAnthropicConfigured: boolean;
  configuredVertexModel: string;
  configuredAnthropicModel: string | null;
  providers: {
    vertex: {
      adapterImplemented: boolean;
      configured: boolean;
      authMode: string;
      model: string;
      liveValidated: boolean;
    };
    anthropic: {
      adapterImplemented: boolean;
      configured: boolean;
      authMode: string;
      model: string | null;
      liveValidated: boolean;
    };
  };
} {
  const activeId = (process.env.AI_PROVIDER || 'vertex').toLowerCase().trim();
  const isVertex = activeId === 'vertex' || activeId === 'google' || activeId === 'gemini';

  const isVertexConfigured = !!(
    (process.env.VERTEX_API_KEY && process.env.VERTEX_API_KEY.trim()) ||
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) ||
    (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim())
  );

  const isAnthropicConfigured = !!(
    process.env.ANTHROPIC_API_KEY &&
    process.env.ANTHROPIC_API_KEY.trim() &&
    process.env.ANTHROPIC_MODEL &&
    process.env.ANTHROPIC_MODEL.trim()
  );

  const vertexModel = (process.env.VERTEX_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  const anthropicModel = process.env.ANTHROPIC_MODEL ? process.env.ANTHROPIC_MODEL.trim() : null;

  return {
    activeProviderId: isVertex ? 'vertex' : activeId === 'anthropic' ? 'anthropic' : activeId,
    activeProviderName: isVertex ? 'Vertex AI' : activeId === 'anthropic' ? 'Anthropic Claude' : activeId,
    isVertexConfigured,
    isAnthropicConfigured,
    configuredVertexModel: vertexModel,
    configuredAnthropicModel: anthropicModel,
    providers: {
      vertex: {
        adapterImplemented: true,
        configured: isVertexConfigured,
        authMode: 'Vertex AI Express Mode (API Key)',
        model: vertexModel,
        liveValidated: true, // Milestone validated locally with real Vertex inference
      },
      anthropic: {
        adapterImplemented: true,
        configured: isAnthropicConfigured,
        authMode: 'Anthropic API Key (Environment Configured)',
        model: anthropicModel,
        liveValidated: false, // Unconfigured and untested in live runtime
      },
    },
  };
}
