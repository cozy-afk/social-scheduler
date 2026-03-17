import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-utils';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  const hashtagId = searchParams.get('hashtagId');
  const igUserId = searchParams.get('igUserId');
  const type = (searchParams.get('type') ?? 'top') as 'top' | 'recent';
  const rawLimit = parseInt(searchParams.get('limit') ?? '25', 10);
  const limit = Math.min(Math.max(rawLimit, 1), 50);
  const accessToken = searchParams.get('accessToken') || process.env.META_ACCESS_TOKEN;

  if (!hashtagId) {
    return errorResponse('hashtagId query parameter is required', 400);
  }
  if (!igUserId) {
    return errorResponse('igUserId query parameter is required', 400);
  }
  if (!accessToken) {
    return errorResponse('accessToken is required (pass as query param or set META_ACCESS_TOKEN env)', 400);
  }
  if (type !== 'top' && type !== 'recent') {
    return errorResponse('type must be "top" or "recent"', 400);
  }

  const endpoint = type === 'top' ? 'top_media' : 'recent_media';
  const fields = [
    'id',
    'media_type',
    'media_url',
    'thumbnail_url',
    'permalink',
    'timestamp',
    'like_count',
    'comments_count',
    'caption',
  ].join(',');

  const url = new URL(`https://graph.facebook.com/v22.0/${hashtagId}/${endpoint}`);
  url.searchParams.set('user_id', igUserId);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    return errorResponse(`Meta API error: ${data.error.message}`, 502);
  }

  return successResponse({ data: data.data ?? [] });
});
