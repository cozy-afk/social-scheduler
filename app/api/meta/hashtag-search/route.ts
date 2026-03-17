import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-utils';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q');
  const igUserId = searchParams.get('igUserId');
  const accessToken = searchParams.get('accessToken') || process.env.META_ACCESS_TOKEN;

  if (!q) {
    return errorResponse('q (hashtag name) query parameter is required', 400);
  }
  if (!igUserId) {
    return errorResponse('igUserId query parameter is required', 400);
  }
  if (!accessToken) {
    return errorResponse('accessToken is required (pass as query param or set META_ACCESS_TOKEN env)', 400);
  }

  const url = new URL('https://graph.facebook.com/v22.0/ig-hashtag-search');
  url.searchParams.set('user_id', igUserId);
  url.searchParams.set('q', q);
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    return errorResponse(`Meta API error: ${data.error.message}`, 502);
  }

  const hashtagId: string = data.data?.[0]?.id ?? '';
  if (!hashtagId) {
    return errorResponse(`No hashtag ID returned for "#${q}"`, 404);
  }

  return successResponse({ hashtagId, q });
});
