import { NextRequest, NextResponse } from 'next/server';
import { listObjects } from '@/lib/r2';

/**
 * GET /api/r2/browse?prefix=&delimiter=/
 *
 * Lists folders and objects at a given prefix.
 * delimiter=/ gives you one level at a time (like a file browser).
 * Omit delimiter to list everything recursively under the prefix.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prefix = searchParams.get('prefix') ?? '';
  const delimiter = searchParams.get('delimiter') ?? '/';

  try {
    const result = await listObjects(prefix, delimiter || undefined);
    return NextResponse.json({ ok: true, prefix, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
