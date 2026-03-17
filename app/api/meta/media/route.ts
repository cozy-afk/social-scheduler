import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  getMetaConfig,
  validateMetaConfig,
  buildMetaUrl,
  getErrorMessage,
  withErrorHandler,
} from '@/lib/api-utils';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const limit = parseInt(searchParams.get('limit') || '24', 10);
  const after = searchParams.get('after') || '';

  // Validate required parameters
  if (!accountId) {
    return errorResponse('accountId query parameter is required', 400);
  }

  // Validate limit
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return errorResponse('limit must be between 1 and 100', 400);
  }

  // Get and validate Meta config
  const config = getMetaConfig(request, searchParams);
  try {
    validateMetaConfig(config);
  } catch (error) {
    return errorResponse(getErrorMessage(error), 400);
  }

  const { accessToken } = config;

  // TypeScript: we know accessToken is defined after validateMetaConfig
  if (!accessToken) {
    return errorResponse('accessToken is required', 400);
  }

  // Build query parameters
  const queryParams: Record<string, string | number> = {
    fields: 'id,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,caption',
    limit,
    access_token: accessToken,
  };

  if (after) {
    queryParams.after = after;
  }

  // Fetch media
  const res = await fetch(buildMetaUrl(`${accountId}/media`, queryParams));
  const data = await res.json();

  if (data.error) {
    return errorResponse(`Meta API error: ${data.error.message}`, 500);
  }

  return successResponse(data);
});
