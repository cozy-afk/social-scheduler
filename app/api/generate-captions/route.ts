import { NextRequest } from 'next/server';
import { generateCaptions } from '@/lib/ai-service';
import { AIProvider } from '@/types/ai';
import {
  parseRequestBody,
  validateRequiredFields,
  successResponse,
  errorResponse,
  validateStringLength,
  validateArray,
  withErrorHandler,
} from '@/lib/api-utils';

interface GenerateCaptionsRequest {
  platform: string;
  postType: string;
  exampleCaptions: string[];
  provider?: AIProvider;
}

const PLATFORM_RULES: Record<string, { maxLength: number; style: string }> = {
  instagram_post: {
    maxLength: 150,
    style: 'short, captivating, emoji-rich',
  },
  instagram_reel: {
    maxLength: 150,
    style: 'short, captivating, emoji-rich',
  },
  instagram_story: {
    maxLength: 100,
    style: 'very short, casual, authentic',
  },
  tiktok_reel: {
    maxLength: 100,
    style: 'very short, engaging, teasing',
  },
  tiktok_slideshow: {
    maxLength: 100,
    style: 'very short, engaging, teasing with swipe call-to-action',
  },
  tiktok_story: {
    maxLength: 100,
    style: 'very short, casual, authentic',
  },
  x_post: {
    maxLength: 280,
    style: 'longer form, conversational',
  },
  threads_post: {
    maxLength: 280,
    style: 'longer form, conversational',
  },
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<GenerateCaptionsRequest>(request);

  // Validate required fields
  const validation = validateRequiredFields(body, [
    'platform',
    'postType',
    'exampleCaptions',
  ]);

  if (!validation.valid) {
    return errorResponse(
      `Missing required fields: ${validation.missing.join(', ')}`,
      400
    );
  }

  const { platform, postType, exampleCaptions, provider = 'anthropic' } = body;

  // Validate post type
  if (!PLATFORM_RULES[postType]) {
    return errorResponse(
      `Invalid postType: ${postType}. Must be one of: ${Object.keys(PLATFORM_RULES).join(', ')}`,
      400
    );
  }

  // Validate example captions array
  try {
    validateArray(exampleCaptions, 1, 10);
    exampleCaptions.forEach((caption) => {
      validateStringLength(caption, 1, 500);
    });
  } catch (error) {
    return errorResponse('exampleCaptions must be an array of 1-10 strings, each 1-500 characters', 400);
  }

  // Validate provider
  if (
    provider !== 'anthropic' &&
    provider !== 'openai' &&
    provider !== 'glm-5' &&
    provider !== 'custom'
  ) {
    return errorResponse(
      `Invalid provider: ${provider}. Must be one of: anthropic, openai, glm-5, custom`,
      400
    );
  }

  const rules = PLATFORM_RULES[postType];

  const result = await generateCaptions(
    {
      platform,
      postType,
      exampleCaptions,
      maxLength: rules.maxLength,
      style: rules.style,
    },
    provider
  );

  return successResponse(result);
});
