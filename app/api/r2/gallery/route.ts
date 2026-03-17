import { NextRequest, NextResponse } from 'next/server';
import { listObjects, getPresignedUrl, getPublicUrl } from '@/lib/r2';
import { GalleryAsset } from '@/types/models';

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
  const { searchParams } = new URL(req.url);
  const modelFolder = searchParams.get('modelFolder');
  const presign = searchParams.get('presign') !== 'false';

  if (!modelFolder) {
    return NextResponse.json({ ok: false, error: 'modelFolder is required' }, { status: 400 });
  }

  const prefix = `[MODELS]/${modelFolder}/`;

  try {
    const { objects } = await listObjects(prefix);

    const assets: GalleryAsset[] = [];

    for (const obj of objects) {
      const fileType = fileTypeOf(obj.key);
      if (!fileType) continue; // skip non-media files

      // The UUID is the second-to-last path segment: prefix/folder/UUID/filename
      const parts = obj.key.split('/');
      const fileName = parts[parts.length - 1];
      const uuid = parts[parts.length - 2];
      const folder = parts[parts.length - 3]; // subfolder name e.g. "pics", "reels"

      const fileUrl = presign
        ? await getPresignedUrl(obj.key, 3600)
        : getPublicUrl(obj.key);

      assets.push({
        id: uuid,
        fileName,
        fileUrl,
        fileType,
        sizeBytes: obj.size,
        uploadedAt: obj.lastModified.toISOString(),
        source: 's3',
        s3Key: obj.key,
        // Store folder as a tag so UI can group/filter by it
        // We reuse the thumbnailUrl slot for the folder name (used as category tag)
        thumbnailUrl: fileType === 'video' ? undefined : fileUrl,
      });
    }

    // Sort newest first (by lastModified)
    assets.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({ ok: true, assets, total: assets.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
