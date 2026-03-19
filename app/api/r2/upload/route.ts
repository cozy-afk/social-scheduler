import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getPresignedUploadUrl, getR2Client, r2Bucket } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const ALLOWED_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'avif',
  'mp4', 'mov', 'webm', 'avi', 'mkv',
]);
const MAX_FILENAME_LEN = 200;

/**
 * POST /api/r2/upload
 * Body: { modelFolder: string; fileName: string; contentType: string; subPath?: string }
 *
 * Returns a presigned PUT URL the client can use to upload directly to R2,
 * plus the final object key (so the client can add it to gallery state).
 *
 * Normal assets:  [MODELS]/{modelFolder}/{uuid}/{fileName}
 * Variants:       [MODELS]/{modelFolder}/_variants/{fileName}
 *   (subPath="_variants" — no extra uuid layer; fileName encodes the base asset id)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ── FormData path: client sends blob directly → we PUT to R2 server-side (no CORS) ──
  const contentTypeHeader = req.headers.get('content-type') ?? '';
  if (contentTypeHeader.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const modelFolder = form.get('modelFolder') as string | null;
    const fileName = form.get('fileName') as string | null;
    const subPath = form.get('subPath') as string | null;

    if (!file || !modelFolder || !fileName) {
      return NextResponse.json({ ok: false, error: 'Missing file, modelFolder or fileName' }, { status: 400 });
    }

    const contentType = file.type;
    if (!ALLOWED_MIME_PREFIXES.some((p) => contentType.startsWith(p))) {
      return NextResponse.json({ ok: false, error: 'Unsupported content type' }, { status: 400 });
    }
    const ext = (fileName.split('.').pop() ?? '').toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json({ ok: false, error: 'Unsupported file extension' }, { status: 400 });
    }

    const safeFolder = modelFolder.replace(/[^a-zA-Z0-9_\-]/g, '');
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '_');
    const allowedSubPaths = new Set(['_variants']);
    const safeSubPath = typeof subPath === 'string' && allowedSubPaths.has(subPath) ? `/${subPath}` : '';
    const key = safeSubPath
      ? `[MODELS]/${safeFolder}${safeSubPath}/${safeFileName}`
      : `[MODELS]/${safeFolder}/${randomUUID()}/${safeFileName}`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const client = getR2Client();
      await client.send(new PutObjectCommand({
        Bucket: r2Bucket(),
        Key: key,
        Body: Buffer.from(arrayBuffer),
        ContentType: contentType,
      }));
      return NextResponse.json({ ok: true, key });
    } catch (err) {
      console.error('[r2/upload/formdata]', err);
      return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 500 });
    }
  }

  // ── JSON path: return presigned URL for client to PUT directly ──
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { modelFolder, fileName, contentType, subPath } = body as Record<string, unknown>;

  if (typeof modelFolder !== 'string' || !modelFolder) {
    return NextResponse.json({ ok: false, error: 'modelFolder is required' }, { status: 400 });
  }
  if (typeof fileName !== 'string' || !fileName || fileName.length > MAX_FILENAME_LEN) {
    return NextResponse.json({ ok: false, error: 'fileName is invalid' }, { status: 400 });
  }
  if (typeof contentType !== 'string' || !ALLOWED_MIME_PREFIXES.some((p) => contentType.startsWith(p))) {
    return NextResponse.json({ ok: false, error: 'Unsupported content type' }, { status: 400 });
  }

  const ext = (fileName.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ ok: false, error: 'Unsupported file extension' }, { status: 400 });
  }

  // Sanitize folder and filename — no path traversal
  const safeFolder = modelFolder.replace(/[^a-zA-Z0-9_\-]/g, '');
  if (!safeFolder) {
    return NextResponse.json({ ok: false, error: 'Invalid modelFolder' }, { status: 400 });
  }
  const safeFileName = fileName.replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '_');

  // Optional sub-path (only "_variants" is accepted to prevent abuse)
  const allowedSubPaths = new Set(['_variants']);
  const safeSubPath = typeof subPath === 'string' && allowedSubPaths.has(subPath) ? `/${subPath}` : '';

  const key = safeSubPath
    ? `[MODELS]/${safeFolder}${safeSubPath}/${safeFileName}`   // variants: flat under _variants/
    : `[MODELS]/${safeFolder}/${randomUUID()}/${safeFileName}`; // normal: scoped uuid folder

  try {
    const uploadUrl = await getPresignedUploadUrl(key, contentType, 900);
    return NextResponse.json({ ok: true, uploadUrl, key });
  } catch (err) {
    console.error('[r2/upload]', err);
    return NextResponse.json({ ok: false, error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
