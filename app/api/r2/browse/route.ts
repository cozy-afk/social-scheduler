import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { listObjects } from '@/lib/r2';

/**
 * GET /api/r2/browse?prefix=&delimiter=/
 *
 * Lists folders and objects at a given prefix.
 * delimiter=/ gives you one level at a time (like a file browser).
 * Omit delimiter to list everything recursively under the prefix.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  // Sanitize prefix: strip traversal sequences, allow safe path chars only
  const rawPrefix = searchParams.get('prefix') ?? '';
  const prefix = rawPrefix.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\/\[\]]/g, '');
  const delimiter = searchParams.get('delimiter') ?? '/';

  try {
    const result = await listObjects(prefix, delimiter || undefined);
    return NextResponse.json({ ok: true, prefix, ...result });
  } catch (err) {
    console.error('[r2/browse]', err);
    return NextResponse.json({ ok: false, error: 'Failed to browse storage' }, { status: 500 });
  }
}
