/**
 * POST /api/meta/publish
 * Publish a post to Instagram via the Content Publishing API.
 *
 * Supports:
 *   - Single image post
 *   - Reel (video)
 *   - Carousel album (2–10 images)
 *   - Story
 */

import { NextRequest } from 'next/server';
import {
  parseRequestBody,
  successResponse,
  errorResponse,
  getErrorMessage,
  withErrorHandler,
} from '@/lib/api-utils';

const GRAPH = 'https://graph.facebook.com/v22.0';

interface PublishMediaRequest {
  igUserId: string;
  accessToken: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL' | 'STORIES';
  mediaUrls: string[];         // Single URL for image/reel/story, multiple for carousel
  caption?: string;
  coverUrl?: string;           // Thumbnail for reels
  locationId?: string;
}

interface MetaApiResponse {
  id?: string;
  status_code?: string;
  error?: { message: string; code: number };
}

// Poll container until status is FINISHED (or error)
async function waitForContainer(
  containerId: string,
  accessToken: string,
  maxWaitMs = 30_000
): Promise<{ ready: boolean; error?: string }> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = (await res.json()) as MetaApiResponse;
    if (data.error) return { ready: false, error: data.error.message };
    if (data.status_code === 'FINISHED') return { ready: true };
    if (data.status_code === 'ERROR') return { ready: false, error: 'Container processing failed' };
    await new Promise((r) => setTimeout(r, 3000));
  }
  return { ready: false, error: 'Timed out waiting for container' };
}

// Create a single media container
async function createContainer(
  igUserId: string,
  accessToken: string,
  params: Record<string, string>
): Promise<{ id?: string; error?: string }> {
  const body = new URLSearchParams({ access_token: accessToken, ...params });
  const res = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: 'POST',
    body,
  });
  const data = (await res.json()) as MetaApiResponse;
  if (data.error) return { error: data.error.message };
  if (!data.id) return { error: 'No container ID returned' };
  return { id: data.id };
}

// Publish a container
async function publishContainer(
  igUserId: string,
  accessToken: string,
  creationId: string
): Promise<{ mediaId?: string; error?: string }> {
  const body = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: 'POST',
    body,
  });
  const data = (await res.json()) as MetaApiResponse;
  if (data.error) return { error: data.error.message };
  return { mediaId: data.id };
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<PublishMediaRequest>(request);

  const { igUserId, accessToken, mediaType, mediaUrls, caption, coverUrl } = body;

  if (!igUserId || !accessToken) {
    return errorResponse('igUserId and accessToken are required', 400);
  }
  if (!mediaUrls || mediaUrls.length === 0) {
    return errorResponse('At least one mediaUrl is required', 400);
  }

  try {
    // ── Reel ────────────────────────────────────────────────────────────────
    if (mediaType === 'REELS') {
      const container = await createContainer(igUserId, accessToken, {
        media_type: 'REELS',
        video_url: mediaUrls[0],
        caption: caption ?? '',
        ...(coverUrl ? { cover_url: coverUrl } : {}),
        share_to_feed: 'true',
      });
      if (container.error) return errorResponse(container.error, 502);

      const ready = await waitForContainer(container.id!, accessToken);
      if (!ready.ready) return errorResponse(ready.error ?? 'Container not ready', 502);

      const published = await publishContainer(igUserId, accessToken, container.id!);
      if (published.error) return errorResponse(published.error, 502);

      return successResponse({ mediaId: published.mediaId, type: 'reel' });
    }

    // ── Story ────────────────────────────────────────────────────────────────
    if (mediaType === 'STORIES') {
      const isVideo = mediaUrls[0].match(/\.(mp4|mov|avi|webm)/i);
      const container = await createContainer(igUserId, accessToken, {
        media_type: 'STORIES',
        ...(isVideo ? { video_url: mediaUrls[0] } : { image_url: mediaUrls[0] }),
      });
      if (container.error) return errorResponse(container.error, 502);

      if (isVideo) {
        const ready = await waitForContainer(container.id!, accessToken);
        if (!ready.ready) return errorResponse(ready.error ?? 'Container not ready', 502);
      }

      const published = await publishContainer(igUserId, accessToken, container.id!);
      if (published.error) return errorResponse(published.error, 502);

      return successResponse({ mediaId: published.mediaId, type: 'story' });
    }

    // ── Carousel ─────────────────────────────────────────────────────────────
    if (mediaType === 'CAROUSEL') {
      if (mediaUrls.length < 2) {
        return errorResponse('Carousel requires at least 2 media URLs', 400);
      }

      // Create individual item containers
      const itemIds: string[] = [];
      for (const url of mediaUrls.slice(0, 10)) {
        const isVideo = url.match(/\.(mp4|mov|avi|webm)/i);
        const item = await createContainer(igUserId, accessToken, {
          is_carousel_item: 'true',
          ...(isVideo ? { video_url: url, media_type: 'VIDEO' } : { image_url: url }),
        });
        if (item.error) return errorResponse(`Carousel item error: ${item.error}`, 502);
        itemIds.push(item.id!);
      }

      // Create carousel container
      const carouselContainer = await createContainer(igUserId, accessToken, {
        media_type: 'CAROUSEL',
        children: itemIds.join(','),
        caption: caption ?? '',
      });
      if (carouselContainer.error) return errorResponse(carouselContainer.error, 502);

      const published = await publishContainer(igUserId, accessToken, carouselContainer.id!);
      if (published.error) return errorResponse(published.error, 502);

      return successResponse({ mediaId: published.mediaId, type: 'carousel' });
    }

    // ── Single Image ──────────────────────────────────────────────────────────
    const container = await createContainer(igUserId, accessToken, {
      image_url: mediaUrls[0],
      caption: caption ?? '',
    });
    if (container.error) return errorResponse(container.error, 502);

    const published = await publishContainer(igUserId, accessToken, container.id!);
    if (published.error) return errorResponse(published.error, 502);

    return successResponse({ mediaId: published.mediaId, type: 'image' });

  } catch (err) {
    return errorResponse(`Publish failed: ${getErrorMessage(err)}`, 500);
  }
});
