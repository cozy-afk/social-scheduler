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

interface Post {
  id: string;
  platform: string;
  status: string;
  scheduledTime: string;
  imageCaption?: string;
  description?: string;
  assets?: Array<{ fileUrl: string }>;
}

interface FanvueConfig {
  accessToken: string;
}

interface PublishScheduledRequest {
  posts: Post[];
  fanvueConfig?: FanvueConfig;
}

interface PublishResult {
  postId: string;
  status: 'published' | 'failed' | 'skipped';
  error?: string;
}

interface PublishScheduledResponse {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
  results: PublishResult[];
}

// This endpoint is called by a cron job. It expects the store state to be
// passed in the request body (since Next.js API routes don't have access to
// client-side Zustand store directly — in a real app, posts would be in a DB).
// For now it accepts an array of posts + configs and publishes the due ones.

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await parseRequestBody<PublishScheduledRequest>(request);

  // Validate required fields
  const validation = validateRequiredFields(body, ['posts']);

  if (!validation.valid) {
    return errorResponse(
      `Missing required fields: ${validation.missing.join(', ')}`,
      400
    );
  }

  const { posts, fanvueConfig } = body;

  // Validate posts array
  try {
    validateArray(posts, 0, 100); // Limit to 100 posts per batch
  } catch (error) {
    return errorResponse(getErrorMessage(error), 400);
  }

  const now = new Date();
  const results: PublishResult[] = [];
  let publishedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const post of posts) {
    // Skip if not scheduled
    if (post.status !== 'scheduled') {
      skippedCount++;
      continue;
    }

    // Skip if no scheduled time
    if (!post.scheduledTime) {
      skippedCount++;
      continue;
    }

    const scheduledAt = new Date(post.scheduledTime);
    if (scheduledAt > now) {
      // Not yet due
      skippedCount++;
      continue;
    }

    // Handle Fanvue posts
    if (post.platform === 'fanvue' && fanvueConfig?.accessToken) {
      try {
        // Make internal API call to fanvue/publish endpoint
        const fanvueUrl = new URL('/api/fanvue/publish', request.url).toString();
        const res = await fetch(fanvueUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: fanvueConfig.accessToken,
            title: post.imageCaption || '',
            description: post.description || '',
            mediaUrls: post.assets?.map((a) => a.fileUrl) || [],
          }),
        });

        const json = await res.json();

        if (res.ok) {
          results.push({ postId: post.id, status: 'published' });
          publishedCount++;
        } else {
          results.push({
            postId: post.id,
            status: 'failed',
            error: json.error || 'Unknown error',
          });
          failedCount++;
        }
      } catch (error) {
        results.push({
          postId: post.id,
          status: 'failed',
          error: getErrorMessage(error),
        });
        failedCount++;
      }
    } else {
      // Unsupported platform or missing config
      skippedCount++;
    }
  }

  return successResponse<PublishScheduledResponse>({
    processed: results.length,
    published: publishedCount,
    failed: failedCount,
    skipped: skippedCount,
    results,
  });
});
