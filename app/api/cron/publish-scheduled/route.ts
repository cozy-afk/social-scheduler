/**
 * POST /api/cron/publish-scheduled
 * Called by an external cron (e.g. Vercel Cron, GitHub Actions, Upstash).
 *
 * Accepts a list of posts + platform configs and publishes any that are due.
 * Since there is no database, the caller (client or cron service) must pass
 * the full post list. In a real deployment, posts would live in a DB.
 */

import { NextRequest } from 'next/server';
import {
  parseRequestBody,
  validateRequiredFields,
  validateArray,
  successResponse,
  errorResponse,
  getErrorMessage,
  withErrorHandler,
} from '@/lib/api-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostAsset {
  fileUrl: string;
  fileType?: 'image' | 'video';
}

interface Post {
  id: string;
  platform: string;
  postType?: string;
  status: string;
  scheduledTime: string;
  imageCaption?: string;
  description?: string;
  assets?: PostAsset[];
}

interface MetaConfig {
  igUserId: string;
  accessToken: string;
}

interface FanvueConfig {
  accessToken: string;
}

interface PublishScheduledRequest {
  posts: Post[];
  metaConfig?: MetaConfig;
  fanvueConfig?: FanvueConfig;
}

interface PublishResult {
  postId: string;
  status: 'published' | 'failed' | 'skipped';
  mediaId?: string;
  error?: string;
}

interface PublishScheduledResponse {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
  results: PublishResult[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveMetaMediaType(post: Post): string {
  const pt = post.postType ?? '';
  if (pt.includes('reel')) return 'REELS';
  if (pt.includes('story')) return 'STORIES';
  if ((post.assets?.length ?? 0) > 1) return 'CAROUSEL';
  const firstAsset = post.assets?.[0];
  if (firstAsset?.fileType === 'video' || firstAsset?.fileUrl.match(/\.(mp4|mov|webm)/i)) return 'REELS';
  return 'IMAGE';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<PublishScheduledRequest>(request);

  const validation = validateRequiredFields(body, ['posts']);
  if (!validation.valid) {
    return errorResponse(`Missing required fields: ${validation.missing.join(', ')}`, 400);
  }

  const { posts, metaConfig, fanvueConfig } = body;

  try {
    validateArray(posts, 0, 100);
  } catch (error) {
    return errorResponse(getErrorMessage(error), 400);
  }

  const now = new Date();
  const results: PublishResult[] = [];
  let publishedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const post of posts) {
    // Skip if not in scheduled state
    if (post.status !== 'scheduled') {
      skippedCount++;
      continue;
    }

    // Skip if no scheduled time
    if (!post.scheduledTime) {
      skippedCount++;
      continue;
    }

    // Skip if not yet due
    const scheduledAt = new Date(post.scheduledTime);
    if (scheduledAt > now) {
      skippedCount++;
      continue;
    }

    const platform = post.platform;
    const mediaUrls = (post.assets ?? []).map((a) => a.fileUrl).filter(Boolean);
    const caption = post.description || post.imageCaption || '';

    // ── Instagram / Meta ────────────────────────────────────────────────────
    if ((platform === 'instagram' || platform === 'threads') && metaConfig?.igUserId && metaConfig.accessToken) {
      try {
        const mediaType = deriveMetaMediaType(post);
        const publishUrl = new URL('/api/meta/publish', request.url).toString();

        const res = await fetch(publishUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            igUserId: metaConfig.igUserId,
            accessToken: metaConfig.accessToken,
            mediaType,
            mediaUrls,
            caption,
          }),
        });

        const json = await res.json();

        if (res.ok && json.data?.mediaId) {
          results.push({ postId: post.id, status: 'published', mediaId: json.data.mediaId });
          publishedCount++;
        } else {
          results.push({ postId: post.id, status: 'failed', error: json.error ?? 'Unknown Meta error' });
          failedCount++;
        }
      } catch (error) {
        results.push({ postId: post.id, status: 'failed', error: getErrorMessage(error) });
        failedCount++;
      }
      continue;
    }

    // ── Fanvue ───────────────────────────────────────────────────────────────
    if (platform === 'fanvue' && fanvueConfig?.accessToken) {
      try {
        const fanvueUrl = new URL('/api/fanvue/publish', request.url).toString();
        const res = await fetch(fanvueUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: fanvueConfig.accessToken,
            title: post.imageCaption || '',
            description: post.description || '',
            mediaUrls,
          }),
        });

        const json = await res.json();

        if (res.ok) {
          results.push({ postId: post.id, status: 'published' });
          publishedCount++;
        } else {
          results.push({ postId: post.id, status: 'failed', error: json.error ?? 'Unknown Fanvue error' });
          failedCount++;
        }
      } catch (error) {
        results.push({ postId: post.id, status: 'failed', error: getErrorMessage(error) });
        failedCount++;
      }
      continue;
    }

    // ── Platform not configured ───────────────────────────────────────────────
    skippedCount++;
  }

  return successResponse<PublishScheduledResponse>({
    processed: results.length,
    published: publishedCount,
    failed: failedCount,
    skipped: skippedCount,
    results,
  });
});
