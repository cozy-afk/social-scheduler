import { NextRequest } from 'next/server';
import { PostReference } from '@/types/models';
import {
  getAnthropicClient,
  parseRequestBody,
  validateRequiredFields,
  successResponse,
  errorResponse,
  parseAnthropicJsonResponse,
  withErrorHandler,
} from '@/lib/api-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerateCaptionsRequest {
  postReferences: PostReference[];
  platform: string;
  postType: string;
  count: number;
  context?: string;
}

export interface GeneratedCaption {
  imageCaption: string;
  description: string;
  hook: string;
  bait: string;
}

interface GenerateCaptionsResponse {
  captions: GeneratedCaption[];
  framework: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatReference(r: PostReference): string {
  const parts: string[] = [];
  if (r.imageCaption) parts.push(`overlay: "${r.imageCaption}"`);
  if (r.caption && r.caption !== r.imageCaption) parts.push(`hook: "${r.caption}"`);
  if (r.description) parts.push(`body: "${r.description}"`);
  if (r.tags.length) parts.push(`tags: ${r.tags.join(', ')}`);
  if (r.performanceRating) parts.push(`rating: ${r.performanceRating}`);
  return `[${r.sourcePlatform}] ${parts.join(' | ')}`;
}

function buildReferenceBlock(refs: PostReference[]): string {
  const high = refs.filter((r) => r.performanceRating === 'high');
  const medium = refs.filter((r) => r.performanceRating === 'medium');
  const other = refs.filter((r) => !r.performanceRating || r.performanceRating === 'low');

  const section = (label: string, items: PostReference[]) =>
    items.length
      ? `${label}:\n${items.map((r) => `  - ${formatReference(r)}`).join('\n')}`
      : null;

  return [
    section('HIGH PERFORMERS', high),
    section('MEDIUM PERFORMERS', medium),
    section('OTHER REFERENCES', other),
  ]
    .filter(Boolean)
    .join('\n\n');
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<GenerateCaptionsRequest>(request);
  const validation = validateRequiredFields(body, ['postReferences', 'platform', 'postType', 'count']);
  if (!validation.valid) {
    return errorResponse(`Missing fields: ${validation.missing.join(', ')}`, 400);
  }

  const { postReferences, platform, postType, count, context } = body;

  if (!Array.isArray(postReferences) || postReferences.length === 0) {
    return errorResponse('postReferences must be a non-empty array', 400);
  }

  const safeCount = Math.min(Math.max(1, Math.floor(count)), 10);
  const refBlock = buildReferenceBlock(postReferences);

  const systemPrompt = `You are an elite social media caption writer for creator accounts on TikTok and Instagram. You specialise in the Hook/Bait/Story/Offer (HBSO) framework:

HOOK: Text that appears ON the video/image. Short, punchy, curiosity-inducing. 5-15 words, all lowercase, no period. This stops the scroll.
BAIT: The implied promise or curiosity gap — makes someone want to visit the profile. Never explicit, always suggestive.
STORY: Brief narrative or relatable context that creates connection.
OFFER: CTA directing to the creator's page, in the description body.

Tone: direct, confident, slightly playful, never desperate.`;

  const userPrompt = `Here are caption references from this creator's library:

${refBlock}

Study the patterns carefully:
1. What makes the high-performers stop the scroll (HOOK structure and wording style)
2. The bait mechanism — how they imply without stating
3. The consistent voice and energy
4. How the description body complements the overlay text
${context ? `\nExtra instruction: ${context}\n` : ''}
Generate exactly ${safeCount} new captions for ${platform} ${postType} that replicate this creator's formula.

Return a JSON object with:
- "framework": 1-2 sentences summarising the HBSO patterns you detected
- "captions": array of exactly ${safeCount} objects, each with:
  - "imageCaption": overlay text (5-15 words, all lowercase, no period — the HOOK)
  - "description": 1-2 sentence post body with CTA
  - "hook": 1 sentence explaining WHY this hook stops the scroll
  - "bait": the specific curiosity gap or implied promise

Return ONLY the raw JSON object, no markdown fences.`;

  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';

  let parsed: GenerateCaptionsResponse;
  try {
    parsed = parseAnthropicJsonResponse(raw) as GenerateCaptionsResponse;
  } catch {
    return errorResponse('Failed to parse AI response', 500);
  }

  if (!Array.isArray(parsed.captions)) {
    return errorResponse('AI returned unexpected format', 500);
  }

  return successResponse({
    captions: parsed.captions.slice(0, safeCount),
    framework: parsed.framework ?? '',
  });
});
