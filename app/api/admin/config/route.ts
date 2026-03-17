import { NextRequest } from 'next/server';
import { successResponse, withErrorHandler } from '@/lib/api-utils';

// GET — return which services are configured (no key values exposed)
export const GET = withErrorHandler(async () => {
  return successResponse({
    r2: {
      configured: !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
      bucket: process.env.R2_BUCKET || null,
    },
    meta: {
      configured: !!(process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID),
      appId: process.env.META_APP_ID || null,
    },
    ai: {
      provider: process.env.AI_PROVIDER || 'anthropic',
      configured: !!(
        (process.env.AI_PROVIDER === 'anthropic' && process.env.ANTHROPIC_API_KEY) ||
        (process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) ||
        (process.env.AI_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) ||
        (process.env.AI_PROVIDER === 'grok' && process.env.GROK_API_KEY) ||
        (!process.env.AI_PROVIDER && process.env.ANTHROPIC_API_KEY)
      ),
    },
    auth: {
      configured: !!(process.env.DISCORD_CLIENT_ID && process.env.NEXTAUTH_SECRET),
    },
  });
});

// POST — acknowledge AI provider selection (update .env.local to persist)
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  return successResponse({
    message: 'Config received. Update .env.local to persist changes.',
    received: { provider: body.provider, model: body.model },
  });
});
