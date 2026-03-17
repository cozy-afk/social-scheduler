import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getPresignedUploadUrl } from '@/lib/r2';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const ALLOWED_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'avif',
  'mp4', 'mov', 'webm', 'avi', 'mkv',
]);
const MAX_FILENAME_LEN = 200;

/**
 * POST /api/r2/upload
 * Body: { modelFolder: string; fileName: string; contentType: string }
 *
 * Returns a presigned PUT URL the client can use to upload directly to R2,
 * plus the final object key (so the client can add it to gallery state).
 * Files go to: [MODELS]/{modelFolder}/{uuid}/{fileName}
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { modelFolder, fileName, contentType } = body as Record<string, unknown>;

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

  const uuid = randomUUID();
  const key = `[MODELS]/${safeFolder}/${uuid}/${safeFileName}`;

  try {
    const uploadUrl = await getPresignedUploadUrl(key, contentType, 900);
    return NextResponse.json({ ok: true, uploadUrl, key, uuid });
  } catch (err) {
    console.error('[r2/upload]', err);
    return NextResponse.json({ ok: false, error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
