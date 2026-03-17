'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function AutoPublisher() {
  const { posts, fanvueConfig } = useStore();

  useEffect(() => {
    const run = async () => {
      if (!fanvueConfig?.accessToken) return;
      const duePosts = posts.filter(
        (p) =>
          p.platform === 'fanvue' &&
          p.status === 'scheduled' &&
          new Date(p.scheduledTime) <= new Date()
      );
      if (duePosts.length === 0) return;

      try {
        await fetch('/api/cron/publish-scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts: duePosts, fanvueConfig }),
        });
      } catch { /* silent */ }
    };

    run();
    const interval = setInterval(run, 60_000);
    return () => clearInterval(interval);
  }, [posts, fanvueConfig]);

  return null;
}
