import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, withErrorHandler } from '@/lib/api-utils';

const GRAPH = 'https://graph.facebook.com/v22.0';

/**
 * GET /api/oauth/meta/callback
 * Meta redirects here after the user authorises (or denies) the app.
 *
 * Flow:
 *  1. Receive short-lived code
 *  2. Exchange for short-lived user access token
 *  3. Exchange for long-lived user access token (60-day)
 *  4. Fetch Facebook pages → grab instagram_business_account id
 *  5. Redirect to /models/{modelId}?meta_connected=1&meta_ig_id=...&meta_token=...
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const modelId = searchParams.get('state');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_reason') ?? 'unknown';

  // User denied or an error occurred
  if (error || !code) {
    const dest = new URL(`/models/${modelId ?? ''}`, request.url);
    dest.searchParams.set('meta_error', error ?? 'missing_code');
    dest.searchParams.set('meta_error_reason', errorReason);
    return NextResponse.redirect(dest.toString());
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return errorResponse(
      'META_APP_ID or META_APP_SECRET not configured in .env.local',
      500
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${request.headers.get('host')}`;
  const redirectUri =
    process.env.META_REDIRECT_URI ?? `${baseUrl}/api/oauth/meta/callback`;

  // ── Step 1: short-lived user access token ─────────────────────────────────

  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);

  const shortRes = await fetch(tokenUrl.toString());
  if (!shortRes.ok) {
    const msg = await shortRes.text();
    return errorResponse(`Meta token exchange failed: ${msg}`, 502);
  }
  const shortData = (await shortRes.json()) as { access_token?: string; error?: { message: string } };
  if (!shortData.access_token) {
    return errorResponse(
      `No access_token in Meta response: ${shortData.error?.message ?? 'unknown'}`,
      502
    );
  }

  // ── Step 2: long-lived token (60-day) ─────────────────────────────────────

  const longUrl = new URL(`${GRAPH}/oauth/access_token`);
  longUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longUrl.searchParams.set('client_id', appId);
  longUrl.searchParams.set('client_secret', appSecret);
  longUrl.searchParams.set('fb_exchange_token', shortData.access_token);

  const longRes = await fetch(longUrl.toString());
  // Fall back to short-lived if exchange fails (e.g. test tokens)
  const longData = longRes.ok
    ? ((await longRes.json()) as { access_token?: string })
    : null;
  const accessToken = longData?.access_token ?? shortData.access_token;

  // ── Step 3: fetch Facebook pages + linked IG business account ─────────────

  const pagesUrl = new URL(`${GRAPH}/me/accounts`);
  pagesUrl.searchParams.set('fields', 'name,instagram_business_account{id,name,username}');
  pagesUrl.searchParams.set('access_token', accessToken);

  const pagesRes = await fetch(pagesUrl.toString());
  let igAccountId = '';
  let igUsername = '';

  if (pagesRes.ok) {
    const pagesData = (await pagesRes.json()) as {
      data?: Array<{
        instagram_business_account?: { id: string; name?: string; username?: string };
      }>;
    };
    const page = pagesData.data?.find((p) => p.instagram_business_account);
    igAccountId = page?.instagram_business_account?.id ?? '';
    igUsername = page?.instagram_business_account?.username ?? '';
  }

  // ── Step 4: redirect back to model page ───────────────────────────────────

  const dest = new URL(`/models/${modelId ?? ''}`, request.url);
  dest.searchParams.set('meta_connected', '1');
  dest.searchParams.set('meta_ig_id', igAccountId);
  dest.searchParams.set('meta_ig_username', igUsername);
  dest.searchParams.set('meta_token', accessToken);
  return NextResponse.redirect(dest.toString());
});
