import { NextRequest, NextResponse } from 'next/server';

const META_API_BASE = 'https://graph.facebook.com/v19.0';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');
  const accessToken = searchParams.get('accessToken') || process.env.META_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    return NextResponse.json({ error: 'Missing accountId or accessToken' }, { status: 400 });
  }

  try {
    // Fetch IG Business Account insights
    const [profileRes, insightsRes, mediaRes] = await Promise.all([
      fetch(
        `${META_API_BASE}/${accountId}?fields=id,name,username,profile_picture_url,followers_count,media_count,biography,website&access_token=${accessToken}`
      ),
      fetch(
        `${META_API_BASE}/${accountId}/insights?metric=impressions,reach,profile_views,follower_count&period=day&since=${daysBefore(28)}&until=${nowUnix()}&access_token=${accessToken}`
      ),
      fetch(
        `${META_API_BASE}/${accountId}/media?fields=id,media_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions,reach,engagement,saved)&limit=12&access_token=${accessToken}`
      ),
    ]);

    const [profile, insights, media] = await Promise.all([
      profileRes.json(),
      insightsRes.json(),
      mediaRes.json(),
    ]);

    if (profile.error) throw new Error(profile.error.message);

    return NextResponse.json({ profile, insights, media });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Meta API error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function daysBefore(days: number) {
  return Math.floor((Date.now() - days * 86400 * 1000) / 1000);
}
