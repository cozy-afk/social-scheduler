import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIProviderConfig } from '@/types/ai';

interface CaptionGenerationParams {
  platform: string;
  postType: string;
  exampleCaptions: string[];
  maxLength: number;
  style: string;
}

/**
 * Custom error class for AI service errors with provider context
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProvider,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * Response from an OpenAI-compatible API
 */
interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

/**
 * Parses AI response text into an array of caption strings
 */
function parseCaptionResponse(text: string, maxCaptions: number = 3): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, maxCaptions);
}

/**
 * Makes a request to an OpenAI-compatible API endpoint
 */
async function fetchOpenAICompatible(
  url: string,
  apiKey: string,
  prompt: string,
  model: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens ?? 500,
      temperature: options?.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
  }

  const data: OpenAICompatibleResponse = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export class AIService {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async generateCaptions(params: CaptionGenerationParams): Promise<string[]> {
    if (!this.config.apiKey) {
      throw new AIServiceError(
        `API key is required for provider: ${this.config.provider}`,
        this.config.provider
      );
    }

    const prompt = this.buildCaptionPrompt(params);

    try {
      switch (this.config.provider) {
        case 'anthropic':
          return await this.generateWithAnthropic(prompt);

        case 'openai':
          return await this.generateWithOpenAI(prompt);

        case 'glm-5':
          return await this.generateWithGLM5(prompt);

        case 'gemini':
          return await this.generateWithGemini(prompt);

        case 'grok':
          return await this.generateWithGrok(prompt);

        case 'custom':
          return await this.generateWithCustomProvider(prompt);

        default:
          throw new AIServiceError(
            `Unsupported AI provider: ${this.config.provider}`,
            this.config.provider
          );
      }
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        `Failed to generate captions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.config.provider,
        error instanceof Error ? error : undefined
      );
    }
  }

  private buildCaptionPrompt(params: CaptionGenerationParams): string {
    return `You are a caption writer for ${params.platform} ${params.postType} posts for OnlyFans creators.

Here are examples of successful captions we've used:
${params.exampleCaptions.map((c) => `- "${c}"`).join('\n')}

Generate 3 new captions in the same style:
- Platform: ${params.platform}
- Post type: ${params.postType}
- Tone: ${params.style}
- Max length: ${params.maxLength} characters
- Include emojis like the examples
- Match the voice and energy of the examples

Return ONLY the 3 captions, one per line, nothing else. Do not number them or add any other text.`;
  }

  private async generateWithAnthropic(prompt: string): Promise<string[]> {
    const anthropic = new Anthropic({
      apiKey: this.config.apiKey,
    });

    const message = await anthropic.messages.create({
      model: this.config.model || 'claude-sonnet-4-6-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return [];
    }

    return parseCaptionResponse(content.text);
  }

  private async generateWithOpenAI(prompt: string): Promise<string[]> {
    const text = await fetchOpenAICompatible(
      'https://api.openai.com/v1/chat/completions',
      this.config.apiKey,
      prompt,
      this.config.model || 'gpt-4'
    );
    return parseCaptionResponse(text);
  }

  private async generateWithGLM5(prompt: string): Promise<string[]> {
    const baseUrl = this.config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const text = await fetchOpenAICompatible(
      baseUrl,
      this.config.apiKey,
      prompt,
      this.config.model || 'glm-4-plus'
    );
    return parseCaptionResponse(text);
  }

  private async generateWithGemini(prompt: string): Promise<string[]> {
    const model = this.config.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API request failed with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return parseCaptionResponse(text);
    } catch (error) {
      // Fall back to OpenAI-compatible endpoint if native API fails
      const fallbackText = await fetchOpenAICompatible(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        this.config.apiKey,
        prompt,
        model
      );
      return parseCaptionResponse(fallbackText);
    }
  }

  private async generateWithGrok(prompt: string): Promise<string[]> {
    const text = await fetchOpenAICompatible(
      'https://api.x.ai/v1/chat/completions',
      this.config.apiKey,
      prompt,
      this.config.model || 'grok-3'
    );
    return parseCaptionResponse(text);
  }

  private async generateWithCustomProvider(prompt: string): Promise<string[]> {
    if (!this.config.baseUrl) {
      throw new AIServiceError(
        'Custom provider requires baseUrl',
        this.config.provider
      );
    }

    const text = await fetchOpenAICompatible(
      this.config.baseUrl,
      this.config.apiKey,
      prompt,
      this.config.model || ''
    );
    return parseCaptionResponse(text);
  }
}

// Default provider configurations using factory functions for lazy evaluation
const DEFAULT_PROVIDER_CONFIGS: Record<AIProvider, () => AIProviderConfig> = {
  anthropic: () => ({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: 'claude-sonnet-4-6-20250514',
  }),
  openai: () => ({
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4',
  }),
  'glm-5': () => ({
    provider: 'glm-5',
    apiKey: process.env.GLM5_API_KEY ?? '',
    model: process.env.GLM5_MODEL ?? 'glm-4-plus',
    baseUrl: process.env.GLM5_BASE_URL,
  }),
  gemini: () => ({
    provider: 'gemini' as const,
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  }),
  grok: () => ({
    provider: 'grok' as const,
    apiKey: process.env.GROK_API_KEY ?? '',
    model: process.env.GROK_MODEL ?? 'grok-3',
  }),
  custom: () => ({
    provider: 'custom',
    apiKey: process.env.CUSTOM_AI_API_KEY ?? '',
    model: process.env.CUSTOM_AI_MODEL ?? '',
    baseUrl: process.env.CUSTOM_AI_BASE_URL ?? '',
  }),
};

/**
 * Factory function to create AI service based on environment/config
 */
export function createAIService(provider?: AIProvider): AIService {
  const selectedProvider = provider ??
    (process.env.AI_PROVIDER as AIProvider) ??
    'anthropic';

  const configFactory = DEFAULT_PROVIDER_CONFIGS[selectedProvider];
  if (!configFactory) {
    throw new AIServiceError(
      `Unknown provider: ${selectedProvider}`,
      selectedProvider
    );
  }

  return new AIService(configFactory());
}

/**
 * Standalone helper used by API routes
 */
export async function generateCaptions(
  params: CaptionGenerationParams,
  provider?: string
): Promise<{ suggestions: string[]; provider: string }> {
  const service = createAIService(provider as AIProvider | undefined);
  const suggestions = await service.generateCaptions(params);
  return {
    suggestions,
    provider: provider ?? process.env.AI_PROVIDER ?? 'anthropic'
  };
}
