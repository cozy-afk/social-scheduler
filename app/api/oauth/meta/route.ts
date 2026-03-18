import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-utils';

const META_GRAPH = 'https://www.facebook.com/dialog/oauth';

const SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

/**
 * GET /api/oauth/meta?modelId=...
 * Redirects the user to the Meta (Facebook) OAuth dialog.
 * After the user authorises, Meta redirects to /api/oauth/meta/callback.
 */
export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const modelId = searchParams.get('modelId');

  if (!modelId) {
    return errorResponse('Missing modelId query parameter', 400);
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return errorResponse(
      'META_APP_ID is not set. Add it to your .env.local file.',
      500
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${request.headers.get('host')}`;
  const redirectUri =
    process.env.META_REDIRECT_URI ?? `${baseUrl}/api/oauth/meta/callback`;

  const url = new URL(META_GRAPH);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', modelId); // carry modelId through the flow

  return NextResponse.redirect(url.toString());
};
