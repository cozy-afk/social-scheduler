import { NextRequest } from 'next/server';
import {
  getAnthropicClient,
  parseRequestBody,
  validateRequiredFields,
  successResponse,
  errorResponse,
  parseAnthropicJsonResponse,
  isValidBase64,
  isValidImageMimeType,
  isValidUrl,
  withErrorHandler,
} from '@/lib/api-utils';

type ExtractMode = 'screenshot' | 'slideshow' | 'post-reference' | 'detect-slides';

interface ExtractCaptionRequest {
  mode: ExtractMode;
  // Screenshot mode
  imageBase64?: string;
  mimeType?: string;
  // Slideshow mode
  combinedText?: string;
  slideCount?: number;
  // Detect-slides mode
  url?: string;
  // Post-reference mode
  coverImageUrl?: string;
}

interface ScreenshotResponse {
  extractedText: string;
}

interface SlideshowResponse {
  slides: string[];
}

interface DetectSlidesResponse {
  slideCount: number;
}

interface PostReferenceResponse {
  coverImageUrl: string | null;
  caption: string;
  description: string;
}

const client = getAnthropicClient();

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<ExtractCaptionRequest>(request);

  // Validate required fields
  const validation = validateRequiredFields(body, ['mode']);

  if (!validation.valid) {
    return errorResponse(
      `Missing required fields: ${validation.missing.join(', ')}`,
      400
    );
  }

  const { mode } = body;

  // Validate mode
  if (
    mode !== 'screenshot' &&
    mode !== 'slideshow' &&
    mode !== 'post-reference' &&
    mode !== 'detect-slides'
  ) {
    return errorResponse(
      'Invalid mode. Use "screenshot", "slideshow", "post-reference", or "detect-slides".',
      400
    );
  }

  // ── Screenshot mode: vision extraction ────────────────────────────────────
  if (mode === 'screenshot') {
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return errorResponse('imageBase64 is required for screenshot mode', 400);
    }

    // Validate base64
    if (!isValidBase64(imageBase64)) {
      return errorResponse('Invalid base64 data', 400);
    }

    // Validate MIME type
    const mimeTypeToUse = mimeType || 'image/jpeg';
    if (!isValidImageMimeType(mimeTypeToUse)) {
      return errorResponse(
        `Invalid MIME type: ${mimeTypeToUse}. Supported: image/jpeg, image/png, image/gif, image/webp`,
        400
      );
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeTypeToUse as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Extract the caption or post text visible in this social media screenshot.
Include hashtags if present. If this is a TikTok slideshow screenshot showing multiple slides, number each slide like:
Slide 1: [text]
Slide 2: [text]
etc.

Return ONLY the caption text — no commentary, no explanation.`,
            },
          ],
        },
      ],
    });

    const extractedText =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    return successResponse<ScreenshotResponse>({ extractedText });
  }

  // ── Slideshow mode: split combined text into per-slide captions ───────────
  if (mode === 'slideshow') {
    const { combinedText, slideCount } = body;

    if (!combinedText || !slideCount) {
      return errorResponse('combinedText and slideCount are required for slideshow mode', 400);
    }

    if (slideCount < 2 || slideCount > 20) {
      return errorResponse('slideCount must be between 2 and 20', 400);
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are splitting a TikTok slideshow caption into exactly ${slideCount} individual slide texts.

Combined text:
"""
${combinedText}
"""

Rules:
- Return exactly ${slideCount} captions, one per line
- Each caption should be self-contained and punchy (under 100 characters)
- They should flow as a narrative sequence
- Keep the original voice, tone, and any emojis/hashtags distributed naturally
- Do NOT number them or add labels — just the raw text, one per line

Return ONLY the ${slideCount} captions, nothing else.`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const slides = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, slideCount);

    // Pad if Claude returned fewer lines than requested
    while (slides.length < slideCount) slides.push('');

    return successResponse<SlideshowResponse>({ slides });
  }

  // ── Detect-slides mode: estimate slide count for a TikTok URL ────────────
  if (mode === 'detect-slides') {
    const { url } = body;

    if (!url) {
      return errorResponse('url is required for detect-slides mode', 400);
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      return errorResponse('Invalid URL format', 400);
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Given this TikTok URL: ${url}

Analyze the URL structure and return ONLY a JSON object like: {"slideCount": 5}

For TikTok photo/slideshow posts (URLs containing /photo/), estimate 3-10 slides.
For regular video posts, return 1.
If unclear, return 3 as a reasonable default.`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text'
        ? response.content[0].text
        : '{"slideCount": 3}';

    try {
      const parsed = parseAnthropicJsonResponse(text) as DetectSlidesResponse;
      return successResponse<DetectSlidesResponse>(parsed);
    } catch {
      return successResponse<DetectSlidesResponse>({ slideCount: 3 });
    }
  }

  // ── Post-reference mode: extract cover + caption + description ────────────
  if (mode === 'post-reference') {
    const { imageBase64, mimeType, url, coverImageUrl } = body;

    let result: PostReferenceResponse;

    if (coverImageUrl) {
      // Validate URL format
      if (!isValidUrl(coverImageUrl)) {
        return errorResponse('Invalid coverImageUrl format', 400);
      }

      // Fetch the image and convert to base64 (Anthropic SDK only supports base64)
      const imgRes = await fetch(coverImageUrl);
      if (!imgRes.ok) {
        return errorResponse('Failed to fetch cover image', 500);
      }

      const imgBuf = await imgRes.arrayBuffer();
      const imgB64 = Buffer.from(imgBuf).toString('base64');
      const imgMime = (imgRes.headers.get('content-type') || 'image/jpeg');

      // Validate MIME type
      if (!isValidImageMimeType(imgMime)) {
        return errorResponse('Invalid image MIME type from coverImageUrl', 400);
      }

      // Vision analysis of the cover image for on-image text
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imgMime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: imgB64,
                },
              },
              {
                type: 'text',
                text: `Analyze this social media post cover image. Return ONLY a JSON object (no markdown fences):
{
  "coverImageUrl": "${coverImageUrl}",
  "caption": "a short description of the visual content (under 150 chars)",
  "description": "a fuller description of what is shown in the image"
}
Also look carefully for any text that appears directly ON the image itself (burned-in captions, text overlays, watermarks with meaningful text). If found, include this as part of the description, prefixed with 'On-image text: '.`,
              },
            ],
          },
        ],
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      result = parseAnthropicJsonResponse(raw) as PostReferenceResponse;
    } else if (imageBase64) {
      // Validate base64
      if (!isValidBase64(imageBase64)) {
        return errorResponse('Invalid base64 data', 400);
      }

      // Validate MIME type
      const mimeTypeToUse = mimeType || 'image/jpeg';
      if (!isValidImageMimeType(mimeTypeToUse)) {
        return errorResponse(
          `Invalid MIME type: ${mimeTypeToUse}. Supported: image/jpeg, image/png, image/gif, image/webp`,
          400
        );
      }

      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeTypeToUse as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `Analyze this social media post screenshot. Extract these three things and return ONLY a JSON object (no markdown fences):
{
  "coverImageUrl": null,
  "caption": "the short hook text or first line of the caption (under 150 chars)",
  "description": "the full longer caption/description text of the post"
}
If you can't distinguish caption from description, put everything in description and use the first sentence as caption.
Also look carefully for any text that appears directly ON the image itself (burned-in captions, text overlays, watermarks with meaningful text). If found, include this as part of the description, prefixed with 'On-image text: '.`,
              },
            ],
          },
        ],
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      result = parseAnthropicJsonResponse(raw) as PostReferenceResponse;
    } else if (url) {
      // Validate URL format
      if (!isValidUrl(url)) {
        return errorResponse('Invalid URL format', 400);
      }

      // Try TikTok oEmbed first
      try {
        const oembedRes = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          result = {
            coverImageUrl: data.thumbnail_url || null,
            caption: data.title || '',
            description: data.author_name ? `by @${data.author_name}` : '',
          };
        } else {
          throw new Error('oEmbed failed');
        }
      } catch {
        // Fallback: Claude can't browse URLs, return empty with note
        result = { coverImageUrl: null, caption: '', description: `Source: ${url}` };
      }
    } else {
      return errorResponse(
        'One of imageBase64, coverImageUrl, or url is required for post-reference mode',
        400
      );
    }

    return successResponse<PostReferenceResponse>(result);
  }

  // This should never be reached due to mode validation above
  return errorResponse('Unhandled mode', 400);
});
