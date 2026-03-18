import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, r2Bucket } from '@/lib/r2';

/**
 * GET /api/r2/proxy?key=[MODELS]/CELIA/...
 *
 * Fetches an R2 object server-side and streams it to the client as
 * same-origin so the browser can use it in canvas without CORS errors.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const key = req.nextUrl.searchParams.get('key');
  if (!key) return new NextResponse('Missing key param', { status: 400 });

  try {
    const client = getR2Client();
    const res = await client.send(
      new GetObjectCommand({ Bucket: r2Bucket(), Key: key })
    );

    const body = res.Body as ReadableStream;
    const contentType = res.ContentType ?? 'image/jpeg';

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[r2/proxy] error', err);
    return new NextResponse('Failed to fetch asset', { status: 500 });
  }
}
