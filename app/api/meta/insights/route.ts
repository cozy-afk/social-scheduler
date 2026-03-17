import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  getMetaConfig,
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

  if (!accountId) {
    return errorResponse('accountId query parameter is required', 400);
  }

  const config = getMetaConfig(request, searchParams);
  const { accessToken } = config;

  if (!accessToken) {
    return errorResponse('accessToken is required', 400);
  }

  // Parallel fetches — profile, account-level insights, online followers, recent media
  const [profileRes, insightsRes, onlineFollowersRes, mediaRes] = await Promise.all([
    // Profile
    fetch(
      buildMetaUrl(accountId, {
        fields: 'id,name,username,profile_picture_url,followers_count,media_count,biography,website',
        access_token: accessToken,
      })
    ),
    // Account insights — v22+ metrics (reach, interactions, engaged accounts, follower growth)
    fetch(
      buildMetaUrl(`${accountId}/insights`, {
        metric: 'reach,total_interactions,accounts_engaged,follows_and_unfollows,likes,saves,shares',
        period: 'day',
        since: String(daysBefore(28)),
        until: String(nowUnix()),
        access_token: accessToken,
      })
    ),
    // Online followers — lifetime breakdown by hour
    fetch(
      buildMetaUrl(`${accountId}/insights`, {
        metric: 'online_followers',
        period: 'lifetime',
        access_token: accessToken,
      })
    ),
    // Recent media (last 30 posts) with per-post insights
    // Uses v22+ metrics: views replaces deprecated plays/impressions
    fetch(
      buildMetaUrl(`${accountId}/media`, {
        fields: [
          'id',
          'media_type',
          'thumbnail_url',
          'media_url',
          'permalink',
          'timestamp',
          'caption',
          'like_count',
          'comments_count',
          'insights.metric(reach,total_interactions,likes,comments,saved,shares,views,ig_reels_avg_watch_time)',
        ].join(','),
        limit: '30',
        access_token: accessToken,
      })
    ),
  ]);

  const [profile, insights, onlineFollowers, media] = await Promise.all([
    profileRes.json(),
    insightsRes.json(),
    onlineFollowersRes.json(),
    mediaRes.json(),
  ]);

  if (profile.error) {
    return errorResponse(`Meta API error: ${profile.error.message}`, 500);
  }

  return successResponse({ profile, insights, onlineFollowers, media });
});
