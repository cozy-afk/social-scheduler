import { NextRequest } from 'next/server';
import { Caption } from '@/types/models';
import {
  getAnthropicClient,
  parseRequestBody,
  validateRequiredFields,
  validateArray,
  successResponse,
  errorResponse,
  parseAnthropicJsonResponse,
  withErrorHandler,
} from '@/lib/api-utils';
import type { AIProvider } from '@/types/ai';

interface AnalyzeCaptionsRequest {
  captions: Caption[];
}

interface AnalyzeCaptionsResponse {
  strategyBrief: string[];
  promptTemplate: string;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<AnalyzeCaptionsRequest>(request);

  // Validate required fields
  const validation = validateRequiredFields(body, ['captions']);

  if (!validation.valid) {
    return errorResponse(
      `Missing required fields: ${validation.missing.join(', ')}`,
      400
    );
  }

  const { captions } = body;

  // Validate captions array
  try {
    validateArray(captions, 3, 50); // Need at least 3 captions to analyze
  } catch (error) {
    return errorResponse('Need at least 3 captions to analyze (max 50)', 400);
  }

  const client = getAnthropicClient();

  // Serialize captions into compact lines grouped by performance rating
  const formatLine = (c: Caption) =>
    `[${c.platform}/${c.postType}] "${c.text}"${c.tags.length ? ` #${c.tags.join(' #')}` : ''}`;

  const high = captions.filter((c) => c.performanceRating === 'high');
  const medium = captions.filter((c) => c.performanceRating === 'medium');
  const low = captions.filter((c) => c.performanceRating === 'low');
  const unrated = captions.filter((c) => !c.performanceRating);

  const section = (label: string, items: Caption[]) =>
    items.length
      ? `${label} (${items.length}):\n${items.map(formatLine).join('\n')}`
      : `${label}: none`;

  const dataBlock = [
    section('HIGH PERFORMERS ⭐⭐⭐', high),
    section('MEDIUM PERFORMERS ⭐⭐', medium),
    section('LOW PERFORMERS ⭐', low),
    section('UNRATED', unrated),
  ].join('\n\n');

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: `You are a social media strategy analyst specialising in content performance for creator accounts across Instagram, TikTok, X, and Threads. You analyse caption libraries to extract winning patterns and build reusable content frameworks.`,
    messages: [
      {
        role: 'user',
        content: `Analyse these captions from our library and identify patterns that differentiate high performers from low performers.

${dataBlock}

Return a JSON object with exactly two keys:
1. "strategyBrief": an array of 5–8 concise bullet-point strings (each under 140 chars). Cover: tone/voice, length patterns, emoji usage, hashtag style, call-to-action patterns, platform-specific differences, and any notable structural patterns.
2. "promptTemplate": a single multi-line string — a reusable system prompt that a caption writer or AI assistant can follow to produce captions matching this account's winning formula. Be specific: include ideal length, tone descriptors, emoji density, hashtag guidance, and opening hook style.

Return ONLY the raw JSON object, no markdown code fences, no extra text.`,
      },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';

  let parsed: AnalyzeCaptionsResponse;
  try {
    parsed = parseAnthropicJsonResponse(raw) as AnalyzeCaptionsResponse;
  } catch (error) {
    return errorResponse('Failed to parse analysis response from AI', 500);
  }

  return successResponse({
    strategyBrief: parsed.strategyBrief ?? [],
    promptTemplate: parsed.promptTemplate ?? '',
  });
});
