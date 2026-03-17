import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { listObjects, getPresignedUrl, getPublicUrl } from '@/lib/r2';
import { GalleryAsset } from '@/types/models';
import { createHash } from 'crypto';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'avi', 'mkv']);

function extOf(key: string): string {
  return (key.split('.').pop() ?? '').toLowerCase();
}

function fileTypeOf(key: string): 'image' | 'video' | null {
  const ext = extOf(key);
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return null;
}

/**
 * GET /api/r2/gallery?modelFolder=LOKI&presign=true
 *
 * Lists all assets under [MODELS]/{modelFolder}/ and returns them as GalleryAsset[].
 * Uses presigned URLs by default (1-hour expiry).
 * Pass presign=false to get raw keys (for public buckets with R2_PUBLIC_BASE_URL set).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const modelFolder = searchParams.get('modelFolder');
  const presign = searchParams.get('presign') !== 'false';

  if (!modelFolder) {
    return NextResponse.json({ ok: false, error: 'modelFolder is required' }, { status: 400 });
  }

  // Validate R2_PUBLIC_BASE_URL is configured before allowing presign=false
  if (!presign && !process.env.R2_PUBLIC_BASE_URL) {
    return NextResponse.json(
      { ok: false, error: 'R2_PUBLIC_BASE_URL must be set to use presign=false' },
      { status: 500 }
    );
  }

  // Sanitize: only allow alphanumeric, hyphens, underscores — prevent path traversal
  const safeFolder = modelFolder.replace(/[^a-zA-Z0-9_\-]/g, '');
  if (!safeFolder) {
    return NextResponse.json({ ok: false, error: 'Invalid modelFolder' }, { status: 400 });
  }

  const prefix = `[MODELS]/${safeFolder}/`;

  try {
    const { objects } = await listObjects(prefix);

    // Compute ETag from the object list (key + lastModified) — cheap, no signing needed
    const etagInput = objects
      .map((o) => `${o.key}:${o.lastModified.getTime()}`)
      .sort()
      .join('|');
    const etag = `"${createHash('sha1').update(etagInput).digest('hex').slice(0, 16)}"`;

    // Return 304 if client already has the same version
    const clientEtag = req.headers.get('if-none-match');
    if (clientEtag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=1800',
        },
      });
    }

    // Filter to media files only, then generate full-resolution URLs in parallel.
    // thumbnailUrl always points to the stable proxy (/api/r2/thumb) so the
    // browser can cache it long-term — presigned URLs expire in 1h and bypass cache.
    const mediaObjects = objects.filter((o) => fileTypeOf(o.key) !== null);

    const assets: GalleryAsset[] = await Promise.all(
      mediaObjects.map(async (obj) => {
        const fileType = fileTypeOf(obj.key)!;
        const parts = obj.key.split('/');
        const fileName = parts[parts.length - 1];
        // UUID is the directory immediately containing the file.
        // For flat uploads (no UUID subdir), fall back to a hash of the full key to avoid duplicate IDs.
        const uuid = parts.length >= 3
          ? parts[parts.length - 2]
          : createHash('sha1').update(obj.key).digest('hex').slice(0, 16);

        const fileUrl = presign
          ? await getPresignedUrl(obj.key, 3600)
          : getPublicUrl(obj.key);

        // Stable cacheable URL for thumbnails; presigned (or public) URL for full playback/download
        const thumbUrl = `/api/r2/thumb?key=${encodeURIComponent(obj.key)}`;

        return {
          id: uuid,
          fileName,
          fileUrl,
          fileType,
          sizeBytes: obj.size,
          uploadedAt: obj.lastModified.toISOString(),
          source: 's3' as const,
          s3Key: obj.key,
          thumbnailUrl: fileType === 'image' ? thumbUrl : undefined,
        };
      })
    );

    // Sort newest first
    assets.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json(
      { ok: true, assets, total: assets.length },
      {
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=1800',
        },
      }
    );
  } catch (err) {
    // Don't leak internal bucket/endpoint details to the client
    console.error('[r2/gallery]', err);
    return NextResponse.json({ ok: false, error: 'Failed to load gallery' }, { status: 500 });
  }
}
