// AI Provider Configuration
export type AIProvider = 'anthropic' | 'openai' | 'glm';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export interface CaptionGenerationRequest {
  platform: string;
  postType: string;
  exampleCaptions: string[];
  maxLength: number;
  style: string;
}

export interface CaptionGenerationResponse {
  suggestions: string[];
  provider: AIProvider;
}

// Provider-specific configurations
export const AI_PROVIDERS = {
  anthropic: {
    name: 'Anthropic Claude',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
    defaultModel: 'claude-sonnet-4-20250514',
  },
  openai: {
    name: 'OpenAI GPT',
    models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4-turbo',
  },
  glm: {
    name: 'GLM (Zhipu AI)',
    models: ['glm-4-plus', 'glm-4', 'glm-3-turbo'],
    defaultModel: 'glm-4-plus',
  },
};

// Environment variable names for each provider
export const AI_ENV_KEYS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  glm: 'GLM_API_KEY',
};
