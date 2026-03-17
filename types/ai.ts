// ─── AI Provider Configuration ─────────────────────────────────────────────────────────

export type AIProvider = 'anthropic' | 'openai' | 'glm-5' | 'custom';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string; // for custom providers
}

export interface AISettings {
  defaultProvider: AIProvider;
  providers: {
    anthropic?: {
      apiKey: string;
      model: 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514';
    };
    openai?: {
      apiKey: string;
      model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
    };
    'glm-5'?: {
      apiKey: string;
      model: string;
      baseUrl?: string;
    };
    custom?: {
      apiKey: string;
      model: string;
      baseUrl: string;
    };
  };
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
  'glm-5': {
    name: 'GLM (Zhipu AI)',
    models: ['glm-4-plus', 'glm-4', 'glm-3-turbo'],
    defaultModel: 'glm-4-plus',
  },
  custom: {
    name: 'Custom Provider',
    models: [],
    defaultModel: '',
  },
} as const;

// Environment variable names for each provider
export const AI_ENV_KEYS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  'glm-5': 'GLM5_API_KEY',
  custom: 'CUSTOM_AI_API_KEY',
} as const;

// ─── Story Generation Configuration ─────────────────────────────────────────────────────────

export interface StoryFolderConfig {
  id: string;
  name: string;
  category: 'daily-life' | 'food' | 'selfie' | 'gym' | 'other';
  s3Path: string; // e.g., "stories/daily-life/"
  enabled: boolean;
  weight: number; // probability weight for selection (1-10)
}

export type CropStrategy = 'center' | 'top' | 'bottom' | 'random' | 'face-detect' | 'rule-of-thirds';

export interface StoryCropStrategy {
  strategy: CropStrategy;
  params?: {
    faceDetectionConfidence?: number; // 0-1
    randomSeed?: number;
    offset?: { x: number; y: number }; // percentage offset
  };
}

export interface StoryGenerationConfig {
  modelId: string;
  dailyCount: number; // 3-4 stories per day
  folders: StoryFolderConfig[];
  distributionPreference?: {
    'daily-life': number; // percentage
    'food': number;
    'selfie': number;
    'gym': number;
    'other': number;
  };
  cropStrategies: StoryCropStrategy[];
  autoSchedule: boolean; // if true, auto-schedules at specific times
  requiresApproval: boolean; // if true, goes to approval queue
}
