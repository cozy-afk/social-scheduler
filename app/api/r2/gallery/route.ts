import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getPresignedUrl, getPublicUrl, getR2Client, r2Bucket } from '@/lib/r2';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { GalleryAsset } from '@/types/models';
import { createHash } from 'crypto';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'avi', 'mkv']);
const PAGE_SIZE = 50;

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
 * GET /api/r2/gallery?modelFolder=LOKI&presign=true&cursor=TOKEN&limit=50
 *
 * Lists assets under [MODELS]/{modelFolder}/ with cursor-based pagination.
 * Returns { ok, assets, nextCursor, total } where nextCursor is null when exhausted.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const modelFolder = searchParams.get('modelFolder');
  const presign = searchParams.get('presign') !== 'false';
  const cursor = searchParams.get('cursor') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 200);

  if (!modelFolder) {
    return NextResponse.json({ ok: false, error: 'modelFolder is required' }, { status: 400 });
  }

  if (!presign && !process.env.R2_PUBLIC_BASE_URL) {
    return NextResponse.json(
      { ok: false, error: 'R2_PUBLIC_BASE_URL must be set to use presign=false' },
      { status: 500 }
    );
  }

  const safeFolder = modelFolder.replace(/[^a-zA-Z0-9_\-]/g, '');
  if (!safeFolder) {
    return NextResponse.json({ ok: false, error: 'Invalid modelFolder' }, { status: 400 });
  }

  const prefix = `[MODELS]/${safeFolder}/`;

  try {
    const client = getR2Client();
    const bucket = r2Bucket();

    // Collect all media objects to sort newest-first, then paginate by index.
    // We need the full list for stable ordering (S3 returns lexicographic order).
    // For very large buckets (1000+ files) this is still fast: S3 list is O(n/1000) requests.
    const allObjects: Array<{ key: string; size: number; lastModified: Date }> = [];
    let continuationToken: string | undefined;

    do {
      const res = await client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }));

      for (const obj of res.Contents ?? []) {
        if (!obj.Key || obj.Key === prefix) continue;
        if (fileTypeOf(obj.Key) === null) continue;
        allObjects.push({
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ?? new Date(),
        });
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    // Sort newest first
    allObjects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    const total = allObjects.length;

    // Decode cursor (base64-encoded page start index)
    const startIndex = cursor
      ? parseInt(Buffer.from(cursor, 'base64url').toString(), 10) || 0
      : 0;
    const endIndex = Math.min(startIndex + limit, total);
    const pageObjects = allObjects.slice(startIndex, endIndex);
    const nextCursor = endIndex < total
      ? Buffer.from(String(endIndex)).toString('base64url')
      : null;

    // ETag covers just this page
    const etagInput = pageObjects.map((o) => `${o.key}:${o.lastModified.getTime()}`).join('|');
    const etag = `"${createHash('sha1').update(etagInput).digest('hex').slice(0, 16)}"`;

    const clientEtag = req.headers.get('if-none-match');
    if (clientEtag === etag && !cursor) {
      return new NextResponse(null, {
        status: 304,
        headers: { 'ETag': etag, 'Cache-Control': 'private, max-age=300, stale-while-revalidate=1800' },
      });
    }

    // Generate URLs only for this page
    const assets: GalleryAsset[] = await Promise.all(
      pageObjects.map(async (obj) => {
        const fileType = fileTypeOf(obj.key)!;
        const parts = obj.key.split('/');
        const fileName = parts[parts.length - 1];

        // Detect variants: path contains /_variants/
        // Variant filenames are: {baseUUID}--v{n}--{originalName}.ext
        const isVariant = obj.key.includes('/_variants/');
        let variantOf: string | undefined;
        let overlayText: string | undefined;
        let variantLabel: string | undefined;
        if (isVariant) {
          // Extract base UUID from filename pattern: {baseUUID}--v{n}--{rest}
          const match = fileName.match(/^([^-]+(?:-[^-]+)*)--v(\d+)--(.+)$/);
          if (match) {
            variantOf = `${safeFolder}-${match[1]}`; // reconstruct scoped ID
            variantLabel = `v${match[2]}`;
            // overlayText is embedded after the second "--" separator in the name part
            // Format: {baseUUID}--v{n}--{overlaySlug}--{ext}
            // We store it as the slug portion before the extension, decoded
            const nameWithoutExt = match[3].replace(/\.[^.]+$/, '');
            overlayText = nameWithoutExt.replace(/_/g, ' ');
          }
        }

        const uuid = isVariant
          ? createHash('sha1').update(obj.key).digest('hex').slice(0, 16)
          : (parts.length >= 3 ? parts[parts.length - 2] : createHash('sha1').update(obj.key).digest('hex').slice(0, 16));

        const fileUrl = presign
          ? await getPresignedUrl(obj.key, 3600)
          : getPublicUrl(obj.key);

        return {
          id: `${safeFolder}-${uuid}`,
          fileName,
          fileUrl,
          fileType,
          sizeBytes: obj.size,
          uploadedAt: obj.lastModified.toISOString(),
          source: 's3' as const,
          s3Key: obj.key,
          thumbnailUrl: fileType === 'image' ? fileUrl : undefined,
          ...(variantOf && { variantOf, variantLabel, overlayText }),
        };
      })
    );

    return NextResponse.json(
      { ok: true, assets, total, nextCursor },
      {
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=1800',
        },
      }
    );
  } catch (err) {
    console.error('[r2/gallery]', err);
    return NextResponse.json({ ok: false, error: 'Failed to load gallery' }, { status: 500 });
  }
}
