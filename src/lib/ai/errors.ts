export class ConfigurationError extends Error {
  public readonly code = 'CONFIGURATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class AIProviderError extends Error {
  public readonly code = 'AI_PROVIDER_ERROR';
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class ModelOutputParseError extends Error {
  public readonly code = 'MODEL_OUTPUT_INVALID';
  constructor(message: string, public readonly rawText?: string) {
    super(message);
    this.name = 'ModelOutputParseError';
  }
}
