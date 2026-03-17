import { NextRequest } from 'next/server';
import {
  parseRequestBody,
  validateArray,
  successResponse,
  errorResponse,
  getMetaConfig,
  validateMetaConfig,
  buildMetaUrl,
  getErrorMessage,
  withErrorHandler,
} from '@/lib/api-utils';

interface TrendsRequest {
  hashtags?: string[];
  handles?: string[];
  accessToken?: string;
  igUserId?: string;
}

interface Post {
  id: string;
  like_count?: number;
  comments_count?: number;
  hashtag?: string;
  handle?: string;
  engagement?: number;
  [key: string]: unknown;
}

// Search for trending posts by hashtag
async function fetchHashtagTopMedia(
  hashtag: string,
  accessToken: string,
  igUserId: string
): Promise<Post[]> {
  try {
    // Step 1: get hashtag ID
    const hashtagRes = await fetch(
      buildMetaUrl('ig_hashtag_search', {
        user_id: igUserId,
        q: hashtag.replace('#', ''),
        access_token: accessToken,
      })
    );
    const hashtagData = await hashtagRes.json();

    if (hashtagData.error || !hashtagData.data?.[0]) {
      return [];
    }

    const hashtagId = hashtagData.data[0].id;

    // Step 2: get top media for that hashtag
    const mediaRes = await fetch(
      buildMetaUrl(`${hashtagId}/top_media`, {
        user_id: igUserId,
        fields: 'id,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,caption',
        access_token: accessToken,
      })
    );
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      return [];
    }

    return (mediaData.data || []).map((post: Record<string, unknown>) => ({
      ...post,
      hashtag,
      engagement: ((post.like_count as number) || 0) + ((post.comments_count as number) || 0),
    })) as Post[];
  } catch {
    return [];
  }
}

// Fetch recent media for account handles (business discovery)
async function fetchHandleMedia(
  handle: string,
  accessToken: string,
  igUserId: string
): Promise<Post[]> {
  try {
    const res = await fetch(
      buildMetaUrl(igUserId, {
        fields: `business_discovery.username_${handle}.fields(id,username,media_count,followers_count,media{id,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,caption})`,
        access_token: accessToken,
      })
    );
    const data = await res.json();

    if (data.error) {
      return [];
    }

    const posts = data.business_discovery?.media?.data || [];
    return posts.map((p: Record<string, unknown>) => ({
      ...p,
      handle,
      engagement: ((p.like_count as number) || 0) + ((p.comments_count as number) || 0),
    })) as Post[];
  } catch {
    return [];
  }
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<TrendsRequest>(request);

  const { hashtags = [], handles = [], accessToken, igUserId } = body;

  // Validate arrays
  try {
    if (hashtags.length > 0) {
      validateArray(hashtags, 1, 5); // Limit to 5 hashtags
    }
    if (handles.length > 0) {
      validateArray(handles, 1, 5); // Limit to 5 handles
    }
  } catch (error) {
    return errorResponse(getErrorMessage(error), 400);
  }

  // Check if we have at least one search criteria
  if (hashtags.length === 0 && handles.length === 0) {
    return errorResponse('At least one hashtag or handle is required', 400);
  }

  // Get and validate Meta config
  const config = { accessToken, igUserId };
  try {
    validateMetaConfig(config);
  } catch (error) {
    return errorResponse(getErrorMessage(error), 400);
  }

  const { accessToken: token, igUserId: userId } = config;

  // TypeScript: we know these are defined after validateMetaConfig
  if (!token || !userId) {
    return errorResponse('accessToken and igUserId are required', 400);
  }

  // Fetch top media for each hashtag (in parallel, limit to 5 hashtags)
  const hashtagResults = await Promise.all(
    hashtags.slice(0, 5).map((tag) => fetchHashtagTopMedia(tag, token, userId))
  );

  // Fetch recent media for account handles (business discovery)
  const handleResults = await Promise.all(
    handles.slice(0, 5).map((handle) => fetchHandleMedia(handle, token, userId))
  );

  // Merge, sort by engagement, take top 20
  const allPosts = [
    ...hashtagResults.flat(),
    ...handleResults.flat(),
  ]
    .sort((a, b) => (b.engagement || 0) - (a.engagement || 0))
    .slice(0, 20);

  return successResponse({ posts: allPosts });
});
