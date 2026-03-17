'use client';

import { GalleryAsset } from '@/types/models';

const STALE_MS  = 5  * 60 * 1000; // 5 min  — serve instantly, refresh in bg
const EXPIRE_MS = 30 * 60 * 1000; // 30 min — force full reload
const MAX_ENTRIES = 10;

interface CacheEntry {
  modelId: string;
  assets:  GalleryAsset[];
  etag:    string | null;
  fetchedAt: number;
}

export type CacheStatus = 'fresh' | 'stale' | 'miss';

export interface CacheResult {
  assets: GalleryAsset[];
  etag:   string | null;
  status: CacheStatus;
}

// Module-level map — survives re-renders, cleared on page refresh
const cache    = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<void>>();

function evictOldest() {
  if (cache.size <= MAX_ENTRIES) return;
  let oldestKey = '';
  let oldestTime = Infinity;
  cache.forEach((entry, key) => {
    if (entry.fetchedAt < oldestTime) { oldestTime = entry.fetchedAt; oldestKey = key; }
  });
  if (oldestKey) cache.delete(oldestKey);
}

export function getCachedAssets(modelId: string): CacheResult | null {
  const entry = cache.get(modelId);
  if (!entry) return null;
  const age = Date.now() - entry.fetchedAt;
  if (age > EXPIRE_MS) { cache.delete(modelId); return null; }
  return { assets: entry.assets, etag: entry.etag, status: age > STALE_MS ? 'stale' : 'fresh' };
}

export function setCachedAssets(modelId: string, assets: GalleryAsset[], etag: string | null) {
  cache.set(modelId, { modelId, assets, etag, fetchedAt: Date.now() });
  evictOldest();
}

export function invalidateCache(modelId: string) {
  cache.delete(modelId);
}

export async function fetchGalleryAssets(
  s3Folder: string,
  etag: string | null = null,
): Promise<{ assets: GalleryAsset[]; etag: string | null; notModified: boolean }> {
  const headers: HeadersInit = etag ? { 'If-None-Match': etag } : {};
  const res = await fetch(`/api/r2/gallery?modelFolder=${encodeURIComponent(s3Folder)}`, { headers });

  if (res.status === 304) {
    return { assets: [], etag, notModified: true };
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const json = await res.json();
  const newEtag = res.headers.get('etag');
  return { assets: json.assets as GalleryAsset[], etag: newEtag, notModified: false };
}

/**
 * Fire-and-forget prefetch — called on model hover in Sidebar.
 * Skips if cache is fresh or a fetch is already in flight.
 */
export function prefetchGalleryAssets(s3Folder: string, modelId: string): void {
  const cached = getCachedAssets(modelId);
  if (cached?.status === 'fresh') return;
  if (inFlight.has(modelId)) return;

  const promise = fetchGalleryAssets(s3Folder, cached?.etag ?? null)
    .then(({ assets, etag, notModified }) => {
      if (!notModified) setCachedAssets(modelId, assets, etag);
    })
    .catch(() => { /* silent — prefetch is best-effort */ })
    .finally(() => inFlight.delete(modelId));

  inFlight.set(modelId, promise);
}
