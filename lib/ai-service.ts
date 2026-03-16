import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIProviderConfig } from '@/types/ai-config';

interface CaptionGenerationParams {
  platform: string;
  postType: string;
  exampleCaptions: string[];
  maxLength: number;
  style: string;
}

export class AIService {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async generateCaptions(params: CaptionGenerationParams): Promise<string[]> {
    const prompt = this.buildCaptionPrompt(params);

    switch (this.config.provider) {
      case 'anthropic':
        return this.generateWithAnthropic(prompt);
      
      case 'openai':
        return this.generateWithOpenAI(prompt);
      
      case 'glm-5':
        return this.generateWithGLM5(prompt);
      
      case 'custom':
        return this.generateWithCustomProvider(prompt);
      
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
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
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') return [];

    return content.text
      .split('\n')
      .filter((line) => line.trim())
      .slice(0, 3);
  }

  private async generateWithOpenAI(prompt: string): Promise<string[]> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    return text
      .split('\n')
      .filter((line: string) => line.trim())
      .slice(0, 3);
  }

  private async generateWithGLM5(prompt: string): Promise<string[]> {
    // GLM-5 API (ZhipuAI)
    const baseUrl = this.config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'glm-4-plus',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    return text
      .split('\n')
      .filter((line: string) => line.trim())
      .slice(0, 3);
  }

  private async generateWithCustomProvider(prompt: string): Promise<string[]> {
    if (!this.config.baseUrl) {
      throw new Error('Custom provider requires baseUrl');
    }

    const response = await fetch(this.config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    // Assume OpenAI-compatible response format
    const text = data.choices?.[0]?.message?.content || '';
    
    return text
      .split('\n')
      .filter((line: string) => line.trim())
      .slice(0, 3);
  }
}

// Factory function to create AI service based on environment/config
export function createAIService(provider?: AIProvider): AIService {
  const selectedProvider = provider || (process.env.AI_PROVIDER as AIProvider) || 'anthropic';
  
  const configs: Record<AIProvider, AIProviderConfig> = {
    anthropic: {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-sonnet-4-20250514',
    },
    openai: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
    },
    'glm-5': {
      provider: 'glm-5',
      apiKey: process.env.GLM5_API_KEY || '',
      model: process.env.GLM5_MODEL || 'glm-4-plus',
      baseUrl: process.env.GLM5_BASE_URL,
    },
    custom: {
      provider: 'custom',
      apiKey: process.env.CUSTOM_AI_API_KEY || '',
      model: process.env.CUSTOM_AI_MODEL || '',
      baseUrl: process.env.CUSTOM_AI_BASE_URL || '',
    },
  };

  return new AIService(configs[selectedProvider]);
}

// Standalone helper used by API routes
export async function generateCaptions(
  params: CaptionGenerationParams,
  provider?: string
): Promise<{ suggestions: string[]; provider: string }> {
  const service = createAIService(provider as AIProvider | undefined);
  const suggestions = await service.generateCaptions(params);
  return { suggestions, provider: provider || 'anthropic' };
}
