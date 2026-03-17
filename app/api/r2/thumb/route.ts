import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, r2Bucket } from '@/lib/r2';

const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'avif', 'mp4', 'mov', 'webm', 'avi', 'mkv']);

/**
 * GET /api/r2/thumb?key=<r2-object-key>
 *
 * Proxies a single R2 object with long-lived browser cache headers.
 * Unlike presigned URLs (1h TTL), these URLs are stable — the browser
 * caches them for 1 hour and revalidates in the background, making
 * repeat gallery views instant.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get('key') ?? '';

  // Sanitize: no path traversal, only safe characters
  if (!key || key.includes('..') || !/^[a-zA-Z0-9_\-\/\[\]. ]+$/.test(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const ext = (key.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  try {
    const client = getR2Client();
    const res = await client.send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));

    if (!res.Body) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Convert the SDK stream to a byte array
    const bytes = await res.Body.transformToByteArray();
    const contentType = res.ContentType ?? mimeOf(ext);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        // Stable URL → long browser cache. Private so CDN won't serve to other users.
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: unknown) {
    const code = (err as { Code?: string; name?: string }).Code ?? (err as { name?: string }).name;
    if (code === 'NoSuchKey' || code === 'NotFound') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[r2/thumb]', err);
    return NextResponse.json({ error: 'Failed to load asset' }, { status: 500 });
  }
}

function mimeOf(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', heic: 'image/heic',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  };
  return map[ext] ?? 'application/octet-stream';
}
