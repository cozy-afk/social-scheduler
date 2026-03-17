import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { accessToken, title, description, mediaUrls } = body;

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token provided' }, { status: 401 });
  }

  try {
    // Step 1: Create the post
    const postRes = await fetch('https://api.fanvue.com/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Fanvue-API-Version': '2025-06-26',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title || '',
        body: description || '',
        // Media would be attached via upload separately
        // For now, include mediaUrls in the post body for reference
        ...(mediaUrls?.length > 0 ? { mediaUrls } : {}),
      }),
    });

    if (!postRes.ok) {
      const err = await postRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { message?: string }).message || `Fanvue API error: ${postRes.status}` },
        { status: postRes.status }
      );
    }

    const data = await postRes.json();
    return NextResponse.json({ success: true, post: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
