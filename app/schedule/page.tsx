'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockPosts, mockGalleryAssets } from '@/lib/mockData';
import { GalleryAsset, Post, Platform, PostType } from '@/types/models';
import {
  Film, Heart, MessageCircle, Bookmark, ChevronLeft, ChevronRight,
  CheckCircle2, ExternalLink, Share2, Send, Repeat2, MoreHorizontal,
  TrendingUp, CalendarDays, LayoutGrid, Play, Music2,
} from 'lucide-react';
import Link from 'next/link';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, isToday, startOfWeek, endOfWeek, parseISO,
  isWithinInterval, startOfDay, endOfDay,
} from 'date-fns';
import { PLATFORM_THEMES } from '@/lib/constants/platform';

// ─── Types ────────────────────────────────────────────────────────────────────

const PREVIEW_PLATFORMS: Platform[] = ['instagram', 'tiktok', 'threads', 'x'];

const REEL_TYPES = new Set<PostType>(['instagram_reel', 'tiktok_reel']);
const STORY_TYPES = new Set<PostType>(['instagram_story', 'tiktok_story']);

// ─── Left Panel: Approved Assets ─────────────────────────────────────────────

function ApprovedAssetsPanel({
  assets,
  selectedId,
  onSelect,
  onDragStart,
}: {
  assets: GalleryAsset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
}) {
  return (
    <aside
      className="flex flex-col flex-shrink-0 overflow-hidden rounded-xl"
      style={{
        width: 268,
        background: 'var(--bg-card)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-sm font-bold text-white">Approved Assets</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {assets.length} ready to schedule
          </p>
        </div>
        <Link href="/gallery" className="text-[10px] flex items-center gap-1 hover:text-violet-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
          <ExternalLink className="w-3 h-3" />
          Gallery
        </Link>
      </div>

      {/* Asset grid */}
      {assets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)' }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--accent-violet)' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">No approved assets</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Go to Gallery and approve assets to start planning
            </p>
          </div>
          <Link href="/gallery" className="btn-primary text-xs py-1.5 px-3 mt-1">
            Open Gallery
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <AssetThumb
                key={asset.id}
                asset={asset}
                selected={selectedId === asset.id}
                onSelect={() => onSelect(asset.id)}
                onDragStart={() => onDragStart(asset.id)}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function AssetThumb({
  asset,
  selected,
  onSelect,
  onDragStart,
}: {
  asset: GalleryAsset;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onClick={onSelect}
      onDragStart={onDragStart}
      className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all"
      style={{
        border: `2px solid ${selected ? 'rgba(124,58,237,0.8)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: selected ? '0 0 12px rgba(124,58,237,0.3)' : 'none',
      }}
    >
      <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" draggable={false} />
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />

      {/* Video badge */}
      {asset.fileType === 'video' && (
        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
          <Play className="w-2.5 h-2.5 text-white fill-white" />
        </div>
      )}

      {/* Ratio badge */}
      <div className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
        style={{ background: 'rgba(0,0,0,0.7)', color: '#ccc' }}>
        {asset.aspectRatio
          ? Math.abs(asset.aspectRatio - 0.5625) < 0.03 ? '9:16'
          : Math.abs(asset.aspectRatio - 0.8) < 0.03 ? '4:5'
          : '1:1'
          : '—'}
      </div>

      {/* Selected ring */}
      {selected && (
        <div className="absolute inset-0 rounded-lg" style={{ border: '2px solid rgba(124,58,237,0.8)' }} />
      )}

      {/* Drag hint */}
      <div className="absolute inset-0 bg-violet-500/0 hover:bg-violet-500/10 transition-colors rounded-lg" />
    </div>
  );
}

// ─── Platform Post Previews ───────────────────────────────────────────────────

function IGPostPreview({ asset, caption }: { asset: GalleryAsset | null; caption?: string }) {
  const isVideo = asset?.fileType === 'video';
  const is916 = asset ? (asset.aspectRatio ?? 1) < 0.7 : false;

  return (
    <div className="rounded-xl overflow-hidden shadow-xl w-[280px] mx-auto" style={{ background: '#fff' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="w-full h-full rounded-full bg-gray-300" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-black">model_handle</p>
          <p className="text-[9px] text-gray-500">Sponsored</p>
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-700" />
      </div>

      {/* Image area */}
      <div className="relative bg-gray-100" style={{ aspectRatio: is916 ? '9/16' : '1/1', maxHeight: 280, overflow: 'hidden' }}>
        {asset ? (
          isVideo ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <Play className="w-10 h-10 text-white/60 fill-white/60" />
            </div>
          ) : (
            <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #FDE68A, #F97316, #EC4899)' }} />
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-5 h-5 text-gray-800" />
          <MessageCircle className="w-5 h-5 text-gray-800" />
          <Send className="w-5 h-5 text-gray-800" />
          <Bookmark className="w-5 h-5 text-gray-800 ml-auto" />
        </div>
        <p className="text-[10px] font-bold text-black mb-0.5">2,847 likes</p>
        <p className="text-[10px] text-black">
          <span className="font-bold">model_handle</span>{' '}
          <span className="text-gray-600">{caption || 'New content dropping ✨ link in bio for more'}</span>
        </p>
      </div>
    </div>
  );
}

function TikTokPreview({ asset, caption }: { asset: GalleryAsset | null; caption?: string }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-xl w-[200px] mx-auto relative"
      style={{ background: '#000', aspectRatio: '9/16', maxHeight: 355 }}>
      {asset ? (
        <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }} />
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 60%, rgba(0,0,0,0.1) 100%), linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%)' }} />

      {/* Right action buttons */}
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-[9px] text-white font-semibold">18.4K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="text-[9px] text-white font-semibold">842</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-[9px] text-white font-semibold">1.2K</span>
        </div>
        {/* Spinning music disc */}
        <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-white/30 flex items-center justify-center">
          <Music2 className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* Bottom caption */}
      <div className="absolute bottom-0 left-0 right-10 px-3 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-gray-600 border border-white/30" />
          <span className="text-[10px] text-white font-bold">@model_handle</span>
          <span className="text-[9px] border border-white/60 text-white px-1.5 py-0.5 rounded">Follow</span>
        </div>
        <p className="text-[10px] text-white leading-relaxed">
          {caption || 'POV: you found your new fav page 👀 ✨'}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Music2 className="w-3 h-3 text-white" />
          <p className="text-[9px] text-white/70">Original audio · model_handle</p>
        </div>
      </div>
    </div>
  );
}

function ThreadsPreview({ asset, caption }: { asset: GalleryAsset | null; caption?: string }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-xl w-[280px] mx-auto p-4"
      style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gray-600" />
          <div className="w-px flex-1 mt-2" style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>
        <div className="flex-1 min-w-0 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[11px] font-bold text-white">model_handle</p>
            <p className="text-[9px] text-gray-500 ml-auto">now</p>
            <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <p className="text-[11px] text-gray-200 mb-2 leading-relaxed">
            {caption || 'Dropped something special today. Check the link 🔗'}
          </p>
          {asset && (
            <div className="rounded-xl overflow-hidden mb-2" style={{ aspectRatio: '1/1', maxHeight: 200 }}>
              <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-center gap-4 mt-2">
            <Heart className="w-4 h-4 text-gray-500" />
            <MessageCircle className="w-4 h-4 text-gray-500" />
            <Repeat2 className="w-4 h-4 text-gray-500" />
            <Share2 className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function XPreview({ asset, caption }: { asset: GalleryAsset | null; caption?: string }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-xl w-[280px] mx-auto p-4"
      style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-[11px] font-bold text-white">Model Handle</p>
            <p className="text-[9px] text-gray-500">@model_handle · now</p>
          </div>
          <p className="text-[11px] text-gray-200 mb-2 leading-relaxed">
            {caption || 'New content is live 🔥 link in bio for the full thing'}
          </p>
          {asset && (
            <div className="rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '16/9', maxHeight: 140 }}>
              <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-center gap-4 text-gray-500">
            <div className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /><span className="text-[9px]">24</span></div>
            <div className="flex items-center gap-1"><Repeat2 className="w-3.5 h-3.5" /><span className="text-[9px]">156</span></div>
            <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /><span className="text-[9px]">2.1K</span></div>
            <Share2 className="w-3.5 h-3.5 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feed Grid ────────────────────────────────────────────────────────────────

function FeedGrid({
  posts,
  gridSlots,
  assets,
  approvedAssets,
  dragOverSlot,
  onDropToSlot,
  onDragOver,
  onDragLeave,
}: {
  posts: Post[];
  gridSlots: (string | null)[];
  assets: GalleryAsset[];
  approvedAssets: GalleryAsset[];
  dragOverSlot: number | null;
  onDropToSlot: (slotIdx: number) => void;
  onDragOver: (slotIdx: number) => void;
  onDragLeave: () => void;
}) {
  const assetMap = useMemo(() => {
    const m = new Map<string, GalleryAsset>();
    [...assets, ...approvedAssets].forEach((a) => m.set(a.id, a));
    return m;
  }, [assets, approvedAssets]);

  return (
    <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      {gridSlots.map((assetId, idx) => {
        const post = posts[idx];
        const asset = assetId ? assetMap.get(assetId) : null;
        const isDragOver = dragOverSlot === idx;
        const hasContent = !!(post || asset);

        return (
          <div
            key={idx}
            onDragOver={(e) => { e.preventDefault(); onDragOver(idx); }}
            onDragLeave={onDragLeave}
            onDrop={() => onDropToSlot(idx)}
            className="relative aspect-square transition-all"
            style={{
              background: hasContent ? 'transparent' : 'rgba(255,255,255,0.03)',
              outline: isDragOver ? '2px dashed rgba(124,58,237,0.8)' : 'none',
            }}
          >
            {asset ? (
              <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
            ) : post ? (
              post.assets[0]?.fileUrl ? (
                <img src={post.assets[0].fileUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }} />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {isDragOver ? (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.3)' }}>
                    <LayoutGrid className="w-4 h-4" style={{ color: 'var(--accent-violet)' }} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-dashed border-white/15" />
                )}
              </div>
            )}

            {/* Post type badge */}
            {post && (
              <div className="absolute top-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded"
                style={{ background: 'rgba(0,0,0,0.75)', color: '#ddd' }}>
                {REEL_TYPES.has(post.postType) ? 'Reel' : STORY_TYPES.has(post.postType) ? 'Story' : 'Post'}
              </div>
            )}

            {/* Planned (drag-assigned) badge */}
            {asset && !post && (
              <div className="absolute top-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded"
                style={{ background: 'rgba(124,58,237,0.7)', color: '#fff' }}>
                Planned
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Right Panel: Mini Calendar + Quota ──────────────────────────────────────

function MiniCalendar({
  month,
  posts,
  onPrev,
  onNext,
  selectedDate,
  onSelectDate,
}: {
  month: Date;
  posts: Post[];
  onPrev: () => void;
  onNext: () => void;
  selectedDate: Date | null;
  onSelectDate: (d: Date) => void;
}) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstDow = startOfMonth(month).getDay(); // 0=Sun

  const postCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => {
      const key = format(parseISO(p.scheduledTime), 'yyyy-MM-dd');
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [posts]);

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="btn-icon w-7 h-7">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-white">{format(month, 'MMMM yyyy')}</p>
        <button onClick={onNext} className="btn-icon w-7 h-7">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-semibold py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* empty offset cells */}
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}

        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const count = postCountByDay.get(key) ?? 0;
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const today = isToday(day);

          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              className="relative flex flex-col items-center justify-center rounded-lg py-1 transition-colors"
              style={{
                background: isSelected
                  ? 'rgba(124,58,237,0.3)'
                  : today
                  ? 'rgba(255,255,255,0.07)'
                  : 'transparent',
                border: isSelected ? '1px solid rgba(124,58,237,0.6)' : '1px solid transparent',
                minHeight: 32,
              }}
            >
              <span className={`text-[10px] font-medium ${today ? 'text-violet-300' : 'text-zinc-300'}`}>
                {format(day, 'd')}
              </span>
              {count > 0 && (
                <div
                  className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: count >= 3 ? '#22c55e' : count >= 1 ? '#f59e0b' : 'transparent' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 px-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>3+ posts</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>1–2 posts</span>
        </div>
      </div>
    </div>
  );
}

interface QuotaEntry {
  label: string;
  scheduled: number;
  target: number;
  color: string;
}

function QuotaBar({ label, scheduled, target, color }: QuotaEntry) {
  const pct = target > 0 ? Math.min(1, scheduled / target) : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-zinc-300">{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>
          {scheduled}<span className="text-zinc-500 font-normal">/{target}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const {
    models, selectedModelId, setModels, setSelectedModelId,
    currentUser, setCurrentUser, posts, setPosts,
    galleryAssets, setGalleryAssets, approvedAssetIds,
  } = useStore();

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setPosts(mockPosts);
    setGalleryAssets(mockGalleryAssets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  // Approved assets (from store, cross-page)
  const approvedAssets = useMemo(
    () => galleryAssets.filter((a) => approvedAssetIds.includes(a.id)),
    [galleryAssets, approvedAssetIds]
  );

  // Posts for selected model
  const modelPosts = useMemo(
    () => posts.filter((p) => p.modelId === selectedModelId).sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    ),
    [posts, selectedModelId]
  );

  // Selected asset for preview
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const selectedAsset = approvedAssets.find((a) => a.id === selectedAssetId) ?? approvedAssets[0] ?? null;

  // Active platform preview
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');

  // Mini calendar
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<Date | null>(null);

  // Feed grid state — 30 slots, filled with post data then open slots for drag
  const [gridSlots, setGridSlots] = useState<(string | null)[]>(Array(30).fill(null));
  const dragAssetRef = useRef<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const handleDragStart = useCallback((assetId: string) => {
    dragAssetRef.current = assetId;
  }, []);

  const handleDropToSlot = useCallback((slotIdx: number) => {
    if (!dragAssetRef.current) return;
    setGridSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = dragAssetRef.current;
      return next;
    });
    dragAssetRef.current = null;
    setDragOverSlot(null);
  }, []);

  // ── Quota computation ──
  const quotas = useMemo(() => {
    if (!selectedModel) return [];
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthPosts = modelPosts.filter((p) => {
      const t = parseISO(p.scheduledTime);
      return isWithinInterval(t, { start: monthStart, end: monthEnd });
    });

    const result: { platform: Platform; entries: QuotaEntry[] }[] = [];

    for (const freq of selectedModel.postingFrequency) {
      if (!freq.enabled) continue;
      const daysInMonth = monthEnd.getDate();
      const monthlyTarget = freq.postsPerDay * daysInMonth;

      const platformPosts = monthPosts.filter((p) => p.platform === freq.platform);
      const reels = platformPosts.filter((p) => REEL_TYPES.has(p.postType)).length;
      const stories = platformPosts.filter((p) => STORY_TYPES.has(p.postType)).length;
      const regular = platformPosts.filter((p) => !REEL_TYPES.has(p.postType) && !STORY_TYPES.has(p.postType)).length;

      // Proportion from postTypes cycle
      const reelTypes = freq.postTypes.filter((t) => REEL_TYPES.has(t));
      const storyTypes = freq.postTypes.filter((t) => STORY_TYPES.has(t));
      const reelRatio = reelTypes.length / Math.max(freq.postTypes.length, 1);
      const storyRatio = storyTypes.length / Math.max(freq.postTypes.length, 1);
      const postRatio = 1 - reelRatio - storyRatio;

      const theme = PLATFORM_THEMES[freq.platform];
      const entries: QuotaEntry[] = [];

      if (reelRatio > 0) entries.push({ label: 'Reels', scheduled: reels, target: Math.round(monthlyTarget * reelRatio), color: '#e879f9' });
      if (postRatio > 0) entries.push({ label: 'Posts', scheduled: regular, target: Math.round(monthlyTarget * postRatio), color: '#60a5fa' });
      if (storyRatio > 0) entries.push({ label: 'Stories', scheduled: stories, target: Math.round(monthlyTarget * storyRatio), color: '#fb923c' });

      result.push({ platform: freq.platform, entries });
    }

    return result;
  }, [selectedModel, modelPosts]);

  // Posts scheduled on selected calendar day
  const selectedDayPosts = useMemo(() => {
    if (!selectedCalDate) return [];
    return modelPosts.filter((p) =>
      isSameDay(parseISO(p.scheduledTime), selectedCalDate)
    );
  }, [modelPosts, selectedCalDate]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="page-title">Schedule Planner</h1>
          <p className="page-subtitle">
            Plan your feed aesthetic, preview platform posts, and track quota progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent-violet)', border: '1px solid rgba(124,58,237,0.25)' }}>
            {approvedAssets.length} approved
          </span>
          <Link href="/gallery" className="btn-secondary text-xs flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Back to Gallery
          </Link>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">

        {/* ── LEFT: Approved Assets ── */}
        <ApprovedAssetsPanel
          assets={approvedAssets}
          selectedId={selectedAssetId}
          onSelect={setSelectedAssetId}
          onDragStart={handleDragStart}
        />

        {/* ── MIDDLE: Preview + Feed Grid ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
          {/* Platform tabs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] uppercase tracking-wider font-semibold mr-1" style={{ color: 'var(--text-muted)' }}>Preview on</span>
            {PREVIEW_PLATFORMS.map((p) => {
              const theme = PLATFORM_THEMES[p];
              const active = activePlatform === p;
              return (
                <button
                  key={p}
                  onClick={() => setActivePlatform(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  <span>{theme.icon}</span>
                  {theme.label}
                </button>
              );
            })}
          </div>

          {/* Preview + Grid row */}
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            {/* Platform post preview */}
            <div
              className="flex-shrink-0 rounded-xl overflow-hidden flex flex-col"
              style={{
                width: 320,
                background: 'var(--bg-card)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold text-white">
                  {PLATFORM_THEMES[activePlatform].icon} {PLATFORM_THEMES[activePlatform].label} Preview
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {selectedAsset ? selectedAsset.fileName : 'Select an asset from the left'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex items-start justify-center no-scrollbar">
                {activePlatform === 'instagram' && <IGPostPreview asset={selectedAsset} />}
                {activePlatform === 'tiktok' && <TikTokPreview asset={selectedAsset} />}
                {activePlatform === 'threads' && <ThreadsPreview asset={selectedAsset} />}
                {activePlatform === 'x' && <XPreview asset={selectedAsset} />}
              </div>
            </div>

            {/* Feed grid */}
            <div
              className="flex-1 rounded-xl overflow-hidden flex flex-col min-w-0"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p className="text-xs font-bold text-white">Feed Grid</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Drag assets to plan your visual feed
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(124,58,237,0.4)' }} /> Planned
                  <div className="w-3 h-3 rounded-sm ml-2" style={{ background: 'rgba(99,102,241,0.4)' }} /> Scheduled
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
                <FeedGrid
                  posts={modelPosts.slice(0, 30)}
                  gridSlots={gridSlots}
                  assets={galleryAssets}
                  approvedAssets={approvedAssets}
                  dragOverSlot={dragOverSlot}
                  onDropToSlot={handleDropToSlot}
                  onDragOver={setDragOverSlot}
                  onDragLeave={() => setDragOverSlot(null)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Mini Calendar + Quotas ── */}
        <aside
          className="flex-shrink-0 flex flex-col overflow-hidden rounded-xl"
          style={{
            width: 280,
            background: 'var(--bg-card)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
              Schedule Overview
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-6">
            {/* Mini calendar */}
            <MiniCalendar
              month={calMonth}
              posts={modelPosts}
              onPrev={() => setCalMonth((m) => subMonths(m, 1))}
              onNext={() => setCalMonth((m) => addMonths(m, 1))}
              selectedDate={selectedCalDate}
              onSelectDate={setSelectedCalDate}
            />

            {/* Selected day posts */}
            {selectedCalDate && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  {format(selectedCalDate, 'MMM d')} · {selectedDayPosts.length} post{selectedDayPosts.length !== 1 ? 's' : ''}
                </p>
                {selectedDayPosts.length === 0 ? (
                  <p className="text-[11px] text-zinc-600">No posts scheduled</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedDayPosts.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <span className="text-sm">{PLATFORM_THEMES[p.platform].icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-white truncate">
                            {PLATFORM_THEMES[p.platform].label}
                          </p>
                          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                            {format(parseISO(p.scheduledTime), 'h:mm a')} · {REEL_TYPES.has(p.postType) ? 'Reel' : STORY_TYPES.has(p.postType) ? 'Story' : 'Post'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quota counters */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Monthly Quotas · {format(new Date(), 'MMM yyyy')}
              </p>
              {quotas.length === 0 ? (
                <p className="text-[11px] text-zinc-600">No frequency config for this model</p>
              ) : (
                quotas.map(({ platform, entries }) => (
                  <div key={platform} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{PLATFORM_THEMES[platform].icon}</span>
                      <p className="text-[11px] font-bold text-white">{PLATFORM_THEMES[platform].label}</p>
                    </div>
                    {entries.map((entry) => (
                      <QuotaBar key={entry.label} {...entry} />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
