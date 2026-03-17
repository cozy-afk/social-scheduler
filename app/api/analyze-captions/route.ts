import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { Caption } from '@/types/models';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { captions }: { captions: Caption[] } = await req.json();

    if (!Array.isArray(captions) || captions.length < 3) {
      return NextResponse.json(
        { error: 'Need at least 3 captions to analyze' },
        { status: 400 }
      );
    }

    // Serialise captions into compact lines grouped by performance rating
    const formatLine = (c: Caption) =>
      `[${c.platform}/${c.postType}] "${c.text}"${c.tags.length ? ` #${c.tags.join(' #')}` : ''}`;

    const high   = captions.filter((c) => c.performanceRating === 'high');
    const medium = captions.filter((c) => c.performanceRating === 'medium');
    const low    = captions.filter((c) => c.performanceRating === 'low');
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

    let raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';

    // Strip markdown fences if Claude included them despite instructions
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let parsed: { strategyBrief: string[]; promptTemplate: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Last-resort: extract JSON block from response
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse strategy response');
      }
    }

    return NextResponse.json({
      strategyBrief: parsed.strategyBrief ?? [],
      promptTemplate: parsed.promptTemplate ?? '',
    });
  } catch (error) {
    console.error('[analyze-captions]', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
