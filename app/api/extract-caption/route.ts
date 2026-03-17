import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;

    if (
      mode !== 'screenshot' &&
      mode !== 'slideshow' &&
      mode !== 'post-reference' &&
      mode !== 'detect-slides'
    ) {
      return NextResponse.json(
        { error: 'Invalid mode. Use "screenshot", "slideshow", "post-reference", or "detect-slides".' },
        { status: 400 }
      );
    }

    // ── Screenshot mode: vision extraction ────────────────────────────────────
    if (mode === 'screenshot') {
      const { imageBase64, mimeType } = body as {
        imageBase64: string;
        mimeType: string;
      };

      if (!imageBase64) {
        return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
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
                  media_type: (mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
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

      return NextResponse.json({ extractedText });
    }

    // ── Slideshow mode: split combined text into per-slide captions ───────────
    if (mode === 'slideshow') {
      const { combinedText, slideCount } = body as {
        combinedText: string;
        slideCount: number;
      };

      if (!combinedText || !slideCount || slideCount < 2) {
        return NextResponse.json(
          { error: 'combinedText and slideCount (≥ 2) are required' },
          { status: 400 }
        );
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

      return NextResponse.json({ slides });
    }

    // ── Detect-slides mode: estimate slide count for a TikTok URL ────────────
    if (mode === 'detect-slides') {
      const { url } = body as { url: string };
      if (!url) {
        return NextResponse.json({ error: 'url is required' }, { status: 400 });
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
        const parsed = JSON.parse(
          text.replace(/```json?\n?/g, '').replace(/\n?```/g, '').trim()
        );
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({ slideCount: 3 });
      }
    }

    // ── Post-reference mode: extract cover + caption + description ────────────
    if (mode === 'post-reference') {
      const { imageBase64, mimeType, url, coverImageUrl: coverImageUrlInput } = body as {
        imageBase64?: string;
        mimeType?: string;
        url?: string;
        coverImageUrl?: string;
      };

      let result: { coverImageUrl: string | null; caption: string; description: string };

      if (coverImageUrlInput) {
        // Fetch the image and convert to base64 (Anthropic SDK only supports base64)
        const imgRes = await fetch(coverImageUrlInput);
        const imgBuf = await imgRes.arrayBuffer();
        const imgB64 = Buffer.from(imgBuf).toString('base64');
        const imgMime = (imgRes.headers.get('content-type') || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

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
                    media_type: imgMime,
                    data: imgB64,
                  },
                },
                {
                  type: 'text',
                  text: `Analyze this social media post cover image. Return ONLY a JSON object (no markdown fences):
{
  "coverImageUrl": "${coverImageUrlInput}",
  "caption": "a short description of the visual content (under 150 chars)",
  "description": "a fuller description of what is shown in the image"
}
Also look carefully for any text that appears directly ON the image itself (burned-in captions, text overlays, watermarks with meaningful text). If found, include this as part of the description, prefixed with 'On-image text: '.`,
                },
              ],
            },
          ],
        });
        const raw =
          response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
        const cleaned = raw
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '')
          .trim();
        result = JSON.parse(cleaned);
      } else if (imageBase64) {
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
                    media_type: (mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
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
        const raw =
          response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
        const cleaned = raw
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '')
          .trim();
        result = JSON.parse(cleaned);
      } else if (url) {
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
        return NextResponse.json(
          { error: 'imageBase64 or url required' },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unhandled mode' }, { status: 400 });
  } catch (error) {
    console.error('[extract-caption]', error);
    return NextResponse.json({ error: 'Failed to extract caption' }, { status: 500 });
  }
}
