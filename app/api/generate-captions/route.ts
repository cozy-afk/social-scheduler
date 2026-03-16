import { NextRequest, NextResponse } from 'next/server';
import { generateCaptions } from '@/lib/ai-service';
import { AIProvider } from '@/types/ai-providers';

const PLATFORM_RULES = {
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

export async function POST(request: NextRequest) {
  try {
    const { platform, postType, exampleCaptions, provider = 'anthropic' } = await request.json();

    const rules = PLATFORM_RULES[postType as keyof typeof PLATFORM_RULES];
    
    const result = await generateCaptions(
      {
        platform,
        postType,
        exampleCaptions,
        maxLength: rules.maxLength,
        style: rules.style,
      },
      provider as AIProvider
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating captions:', error);
    
    // Return fallback captions if API fails
    return NextResponse.json({
      suggestions: [
        'New content dropping 💎',
        'Check this out 🔥',
        'You don\'t want to miss this 👀',
      ],
      provider: 'fallback',
    });
  }
}
