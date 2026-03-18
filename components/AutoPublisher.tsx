'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function AutoPublisher() {
  const { posts, fanvueConfig, metaConfig, updatePost } = useStore();

  useEffect(() => {
    const run = async () => {
      const now = new Date();
      const duePosts = posts.filter(
        (p) =>
          p.status === 'scheduled' &&
          new Date(p.scheduledTime) <= now
      );
      if (duePosts.length === 0) return;

      // Build config payload — only include configs that are set
      const payload: Record<string, unknown> = { posts: duePosts };
      if (metaConfig?.igUserId && metaConfig.accessToken) {
        payload.metaConfig = { igUserId: metaConfig.igUserId, accessToken: metaConfig.accessToken };
      }
      if (fanvueConfig?.accessToken) {
        payload.fanvueConfig = { accessToken: fanvueConfig.accessToken };
      }

      // Nothing to publish if no credentials are configured
      if (!payload.metaConfig && !payload.fanvueConfig) return;

      try {
        const res = await fetch('/api/cron/publish-scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        // Mark successfully published posts as completed in local state
        if (data.data?.results) {
          for (const result of data.data.results) {
            if (result.status === 'published') {
              updatePost(result.postId, {
                status: 'completed',
                completedAt: new Date().toISOString(),
                postedUrl: result.mediaId ? `https://www.instagram.com/p/${result.mediaId}` : undefined,
              });
            }
          }
        }
      } catch { /* silent — will retry next interval */ }
    };

    run();
    const interval = setInterval(run, 60_000);
    return () => clearInterval(interval);
  }, [posts, fanvueConfig, metaConfig, updatePost]);

  return null;
}
