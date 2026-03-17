import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, withErrorHandler } from '@/lib/api-utils';

const FANVUE_AUTH_URL = 'https://auth.fanvue.com';
const FANVUE_API_BASE = 'https://api.fanvue.com';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // modelId encoded here
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/models/${state || ''}?fanvue_error=${error}`, request.url)
    );
  }
  if (!code) {
    return errorResponse('Missing authorization code', 400);
  }

  const clientId = process.env.FANVUE_CLIENT_ID;
  const clientSecret = process.env.FANVUE_CLIENT_SECRET;
  const redirectUri =
    process.env.FANVUE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/fanvue/callback`;

  if (!clientId || !clientSecret) {
    return errorResponse(
      'Fanvue OAuth not configured. Set FANVUE_CLIENT_ID and FANVUE_CLIENT_SECRET in .env.local',
      500
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch(`${FANVUE_AUTH_URL}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return errorResponse(`Token exchange failed: ${err}`, 500);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string };

  // Fetch Fanvue user profile to get the handle
  const profileRes = await fetch(`${FANVUE_API_BASE}/v1/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok
    ? ((await profileRes.json()) as { username?: string })
    : null;

  // Redirect back to the model settings page with the token and handle as query params.
  // In production these would be stored in a database keyed by modelId.
  const redirectUrl = new URL(`/models/${state}`, request.url);
  redirectUrl.searchParams.set('fanvue_connected', '1');
  redirectUrl.searchParams.set('fanvue_handle', profile?.username || '');
  redirectUrl.searchParams.set('fanvue_token', tokens.access_token || '');
  return NextResponse.redirect(redirectUrl);
});
