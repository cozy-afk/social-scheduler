import { NextRequest, NextResponse } from 'next/server';

const META_API_BASE = 'https://graph.facebook.com/v19.0';

// Search for trending posts by hashtag
async function fetchHashtagTopMedia(hashtag: string, accessToken: string, igUserId: string) {
  // Step 1: get hashtag ID
  const hashtagRes = await fetch(
    `${META_API_BASE}/ig_hashtag_search?user_id=${igUserId}&q=${encodeURIComponent(hashtag.replace('#', ''))}&access_token=${accessToken}`
  );
  const hashtagData = await hashtagRes.json();
  if (hashtagData.error || !hashtagData.data?.[0]) return [];

  const hashtagId = hashtagData.data[0].id;

  // Step 2: get top media for that hashtag
  const mediaRes = await fetch(
    `${META_API_BASE}/${hashtagId}/top_media?user_id=${igUserId}&fields=id,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,caption&access_token=${accessToken}`
  );
  const mediaData = await mediaRes.json();
  if (mediaData.error) return [];

  return (mediaData.data || []).map((post: Record<string, unknown>) => ({
    ...post,
    hashtag,
    engagement: ((post.like_count as number) || 0) + ((post.comments_count as number) || 0),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hashtags = [], handles = [], accessToken, igUserId } = body as {
      hashtags: string[];
      handles: string[];
      accessToken?: string;
      igUserId?: string;
    };

    const token = accessToken || process.env.META_ACCESS_TOKEN;
    const userId = igUserId || process.env.META_IG_USER_ID;

    if (!token || !userId) {
      return NextResponse.json({ error: 'Missing accessToken or igUserId' }, { status: 400 });
    }

    // Fetch top media for each hashtag (in parallel, limit to 5 hashtags)
    const hashtagResults = await Promise.all(
      hashtags.slice(0, 5).map((tag: string) => fetchHashtagTopMedia(tag, token, userId))
    );

    // Fetch recent media for account handles (business discovery)
    const handleResults = await Promise.all(
      handles.slice(0, 5).map(async (handle: string) => {
        const res = await fetch(
          `${META_API_BASE}/${userId}?fields=business_discovery.fields(id,username,media_count,followers_count,media{id,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,caption})&access_token=${token}`
        );
        const data = await res.json();
        if (data.error) return [];
        const posts = data.business_discovery?.media?.data || [];
        return posts.map((p: Record<string, unknown>) => ({
          ...p,
          handle,
          engagement: ((p.like_count as number) || 0) + ((p.comments_count as number) || 0),
        }));
      })
    );

    // Merge, sort by engagement, take top 20
    const allPosts = [
      ...hashtagResults.flat(),
      ...handleResults.flat(),
    ].sort((a, b) => (b.engagement || 0) - (a.engagement || 0)).slice(0, 20);

    return NextResponse.json({ posts: allPosts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Meta API error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
