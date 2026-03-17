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

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function daysBefore(days: number): number {
  return Math.floor((Date.now() - days * 86400 * 1000) / 1000);
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  // Validate required parameters
  if (!accountId) {
    return errorResponse('accountId query parameter is required', 400);
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

  // Fetch IG Business Account insights
  const [profileRes, insightsRes, mediaRes] = await Promise.all([
    fetch(
      buildMetaUrl(accountId, {
        fields: 'id,name,username,profile_picture_url,followers_count,media_count,biography,website',
        access_token: accessToken,
      })
    ),
    fetch(
      buildMetaUrl(`${accountId}/insights`, {
        metric: 'impressions,reach,profile_views,follower_count',
        period: 'day',
        since: daysBefore(28),
        until: nowUnix(),
        access_token: accessToken,
      })
    ),
    fetch(
      buildMetaUrl(`${accountId}/media`, {
        fields: 'id,media_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions,reach,engagement,saved)',
        limit: 12,
        access_token: accessToken,
      })
    ),
  ]);

  const [profile, insights, media] = await Promise.all([
    profileRes.json(),
    insightsRes.json(),
    mediaRes.json(),
  ]);

  if (profile.error) {
    return errorResponse(`Meta API error: ${profile.error.message}`, 500);
  }

  return successResponse({ profile, insights, media });
});
