import { NextRequest, NextResponse } from 'next/server';

// This endpoint is called by a cron job. It expects the store state to be
// passed in the request body (since Next.js API routes don't have access to
// client-side Zustand store directly — in a real app, posts would be in a DB).
// For now it accepts an array of posts + configs and publishes the due ones.

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { posts, fanvueConfig } = body;

  if (!Array.isArray(posts)) {
    return NextResponse.json({ error: 'posts must be an array' }, { status: 400 });
  }

  const now = new Date();
  const results: Array<{ postId: string; status: string; error?: string }> = [];

  for (const post of posts) {
    if (post.status !== 'scheduled') continue;
    if (!post.scheduledTime) continue;

    const scheduledAt = new Date(post.scheduledTime);
    if (scheduledAt > now) continue; // Not yet due

    // Handle Fanvue posts
    if (post.platform === 'fanvue' && fanvueConfig?.accessToken) {
      try {
        const res = await fetch(new URL('/api/fanvue/publish', req.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: fanvueConfig.accessToken,
            title: post.imageCaption || '',
            description: post.description || '',
            mediaUrls: post.assets?.map((a: { fileUrl: string }) => a.fileUrl) || [],
          }),
        });
        const json = await res.json();
        results.push({ postId: post.id, status: res.ok ? 'published' : 'failed', error: json.error });
      } catch (e: unknown) {
        results.push({ postId: post.id, status: 'failed', error: e instanceof Error ? e.message : 'Unknown' });
      }
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
