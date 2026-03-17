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

    // Filter to media files only, then generate all URLs in parallel
    const mediaObjects = objects.filter((o) => fileTypeOf(o.key) !== null);

    const assets: GalleryAsset[] = await Promise.all(
      mediaObjects.map(async (obj) => {
        const fileType = fileTypeOf(obj.key)!;
        const parts = obj.key.split('/');
        const fileName = parts[parts.length - 1];
        const uuid = parts[parts.length - 2];

        const fileUrl = presign
          ? await getPresignedUrl(obj.key, 3600)
          : getPublicUrl(obj.key);

        return {
          id: uuid,
          fileName,
          fileUrl,
          fileType,
          sizeBytes: obj.size,
          uploadedAt: obj.lastModified.toISOString(),
          source: 's3' as const,
          s3Key: obj.key,
          thumbnailUrl: fileType === 'video' ? undefined : fileUrl,
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
