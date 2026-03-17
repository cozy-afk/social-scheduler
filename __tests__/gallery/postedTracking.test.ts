/**
 * Unit tests for the "already posted" tracking logic used in the gallery.
 *
 * The logic (duplicated here as a pure function so it can be tested
 * independently of React / Zustand) builds a Set<fileUrl> from
 * all assets that appear in completed posts.
 */

import type { Post } from '@/types/models';

// ─── Pure function extracted from gallery/page.tsx ───────────────────────────

function buildPostedUrlSet(posts: Post[]): Set<string> {
  const set = new Set<string>();
  for (const post of posts) {
    if (post.status === 'completed') {
      for (const asset of post.assets) {
        if (asset.fileUrl) set.add(asset.fileUrl);
      }
    }
  }
  return set;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makePost = (overrides: Partial<Post> = {}): Post => ({
  id: 'p1',
  modelId: 'm1',
  platform: 'instagram',
  postType: 'instagram_post',
  scheduledTime: '2026-03-01T10:00:00Z',
  status: 'completed',
  description: 'Test post',
  assets: [],
  createdAt: '2026-03-01T09:00:00Z',
  updatedAt: '2026-03-01T10:01:00Z',
  ...overrides,
});

const makeAsset = (fileUrl: string, extra?: Partial<{ id: string; fileName: string; fileType: 'image' | 'video' }>) => ({
  id: extra?.id ?? 'a1',
  postId: 'p1',
  fileUrl,
  fileName: extra?.fileName ?? 'test.jpg',
  fileType: (extra?.fileType ?? 'image') as 'image' | 'video',
  order: 0,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('buildPostedUrlSet', () => {
  it('returns empty set when no posts', () => {
    expect(buildPostedUrlSet([])).toEqual(new Set());
  });

  it('returns empty set when all posts are not completed', () => {
    const posts = [
      makePost({ status: 'scheduled', assets: [makeAsset('https://cdn/img1.jpg')] }),
      makePost({ status: 'draft', id: 'p2', assets: [makeAsset('https://cdn/img2.jpg')] }),
    ];
    expect(buildPostedUrlSet(posts)).toEqual(new Set());
  });

  it('includes fileUrls from completed posts', () => {
    const url = 'https://cdn/img1.jpg';
    const posts = [makePost({ assets: [makeAsset(url)] })];
    const set = buildPostedUrlSet(posts);
    expect(set.has(url)).toBe(true);
    expect(set.size).toBe(1);
  });

  it('excludes assets from non-completed posts', () => {
    const completedUrl = 'https://cdn/done.jpg';
    const scheduledUrl = 'https://cdn/upcoming.jpg';
    const posts = [
      makePost({ status: 'completed', id: 'p1', assets: [makeAsset(completedUrl, { id: 'a1' })] }),
      makePost({ status: 'scheduled', id: 'p2', assets: [makeAsset(scheduledUrl, { id: 'a2' })] }),
    ];
    const set = buildPostedUrlSet(posts);
    expect(set.has(completedUrl)).toBe(true);
    expect(set.has(scheduledUrl)).toBe(false);
  });

  it('handles multiple assets in a single post', () => {
    const urls = ['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg'];
    const assets = urls.map((url, i) => makeAsset(url, { id: `a${i}` }));
    const posts = [makePost({ assets })];
    const set = buildPostedUrlSet(posts);
    urls.forEach((url) => expect(set.has(url)).toBe(true));
    expect(set.size).toBe(3);
  });

  it('deduplicates the same URL appearing in multiple completed posts', () => {
    const url = 'https://cdn/shared.jpg';
    const posts = [
      makePost({ id: 'p1', assets: [makeAsset(url, { id: 'a1' })] }),
      makePost({ id: 'p2', assets: [makeAsset(url, { id: 'a2' })] }),
    ];
    const set = buildPostedUrlSet(posts);
    expect(set.size).toBe(1);
  });

  it('skips assets with empty fileUrl', () => {
    const posts = [makePost({ assets: [makeAsset('', { id: 'a1' })] })];
    const set = buildPostedUrlSet(posts);
    expect(set.size).toBe(0);
  });

  it('handles mixed complete/incomplete across many posts', () => {
    const posts: Post[] = [
      makePost({ id: 'p1', status: 'completed', assets: [makeAsset('https://cdn/1.jpg', { id: 'a1' })] }),
      makePost({ id: 'p2', status: 'draft', assets: [makeAsset('https://cdn/2.jpg', { id: 'a2' })] }),
      makePost({ id: 'p3', status: 'completed', assets: [makeAsset('https://cdn/3.jpg', { id: 'a3' })] }),
      makePost({ id: 'p4', status: 'scheduled', assets: [makeAsset('https://cdn/4.jpg', { id: 'a4' })] }),
    ];
    const set = buildPostedUrlSet(posts);
    expect(set.has('https://cdn/1.jpg')).toBe(true);
    expect(set.has('https://cdn/2.jpg')).toBe(false);
    expect(set.has('https://cdn/3.jpg')).toBe(true);
    expect(set.has('https://cdn/4.jpg')).toBe(false);
    expect(set.size).toBe(2);
  });
});
