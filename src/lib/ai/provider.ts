import { AIProvider } from './types';
import { VertexProvider } from './providers/vertex';
import { AnthropicProvider } from './providers/anthropic';

export class ConfigurationError extends Error {
  constructor(message: string, public readonly code: string = 'CONFIGURATION_ERROR') {
    super(message);
    this.name = 'ConfigurationError';
  }
}

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
 */
export function getProviderConfigDiagnostics(): {
  activeProviderId: string;
  activeProviderName: string;
  activeDefaultModel: string;
  isVertexConfigured: boolean;
  isAnthropicConfigured: boolean;
  configuredVertexModel: string;
  configuredAnthropicModel: string;
} {
  const activeId = (process.env.AI_PROVIDER || 'vertex').toLowerCase().trim();
  const isVertex = activeId === 'vertex' || activeId === 'google' || activeId === 'gemini';

  return {
    activeProviderId: isVertex ? 'vertex' : activeId === 'anthropic' ? 'anthropic' : activeId,
    activeProviderName: isVertex ? 'Vertex AI' : activeId === 'anthropic' ? 'Anthropic Claude' : activeId,
    activeDefaultModel: isVertex
      ? process.env.VERTEX_MODEL || 'gemini-2.5-flash'
      : process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219',
    isVertexConfigured: !!(process.env.VERTEX_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    isAnthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    configuredVertexModel: process.env.VERTEX_MODEL || 'gemini-2.5-flash',
    configuredAnthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219',
  };
}
