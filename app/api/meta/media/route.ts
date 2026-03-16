import { NextRequest, NextResponse } from 'next/server';

const META_API_BASE = 'https://graph.facebook.com/v19.0';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');
  const accessToken = searchParams.get('accessToken') || process.env.META_ACCESS_TOKEN;
  const limit = searchParams.get('limit') || '24';
  const after = searchParams.get('after') || '';

  if (!accountId || !accessToken) {
    return NextResponse.json({ error: 'Missing accountId or accessToken' }, { status: 400 });
  }

  try {
    const cursor = after ? `&after=${after}` : '';
    const res = await fetch(
      `${META_API_BASE}/${accountId}/media?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,caption&limit=${limit}${cursor}&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Meta API error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
