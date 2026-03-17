'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockPosts, mockGalleryAssets } from '@/lib/mockData';
import { GalleryAsset, Post, Platform } from '@/types/models';
import {
  Film, Heart, MessageCircle, Bookmark, ChevronLeft, ChevronRight,
  CheckCircle2, ExternalLink, Share2, Send, Repeat2, MoreHorizontal,
  TrendingUp, CalendarDays, Play, Music2, Grid3X3, Clapperboard,
  Copy, Search, ArrowLeft, Plus, Wifi, Signal, Battery,
  BookMarked, UserCheck, Images, Eye,
} from 'lucide-react';
import Link from 'next/link';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, isToday, parseISO, isWithinInterval,
} from 'date-fns';
import { PLATFORM_THEMES } from '@/lib/constants/platform';
import type { PostType } from '@/types/models';

// ─── Types ────────────────────────────────────────────────────────────────────

const PREVIEW_PLATFORMS: Platform[] = ['instagram', 'tiktok', 'threads', 'x'];
const REEL_TYPES = new Set<PostType>(['instagram_reel', 'tiktok_reel']);
const STORY_TYPES = new Set<PostType>(['instagram_story', 'tiktok_story']);

interface IGMediaItem {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
  timestamp: string;
  isPlanned?: boolean;
  planAssetId?: string;
}

// ─── Phone Frame wrapper ──────────────────────────────────────────────────────

function PhoneFrame({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden"
      style={{
        width: 335,
        height: 680,
        borderRadius: 44,
        background: dark ? '#000' : '#fff',
        border: '8px solid #1a1a1a',
        boxShadow: '0 0 0 1px #333, 0 24px 64px rgba(0,0,0,0.6), inset 0 0 0 1px #222',
      }}
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 rounded-b-2xl z-10"
        style={{ background: '#1a1a1a' }} />
      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 h-7 flex items-end justify-between px-5 pb-1 z-20">
        <span className="text-[9px] font-bold" style={{ color: dark ? '#fff' : '#000' }}>9:41</span>
        <div className="flex items-center gap-1">
          <Signal className="w-2.5 h-2.5" style={{ color: dark ? '#fff' : '#000' }} />
          <Wifi className="w-2.5 h-2.5" style={{ color: dark ? '#fff' : '#000' }} />
          <Battery className="w-3 h-2.5" style={{ color: dark ? '#fff' : '#000' }} />
        </div>
      </div>
      {/* Screen content */}
      <div className="absolute inset-0 top-7 overflow-y-auto no-scrollbar" style={{ borderRadius: 38 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Instagram Profile Page ───────────────────────────────────────────────────

interface IGProfileProps {
  modelName: string;
  mediaItems: IGMediaItem[];
  plannedAssets: GalleryAsset[];
  gridSlots: (string | null)[];
  dragOverSlot: number | null;
  onDropToSlot: (i: number) => void;
  onDragOver: (i: number) => void;
  onDragLeave: () => void;
  loading: boolean;
}

function IGProfilePage({
  modelName, mediaItems, plannedAssets, gridSlots,
  dragOverSlot, onDropToSlot, onDragOver, onDragLeave, loading,
}: IGProfileProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'reels' | 'tagged'>('grid');

  const handle = modelName.toLowerCase().replace(/\s+/g, '_');
  const followerCount = '47.2K';
  const followingCount = '312';
  const postsCount = mediaItems.length + gridSlots.filter(Boolean).length;

  // Merge: grid slots (planned) come first in the grid, then real/scheduled
  const combinedGrid: Array<{ type: 'real' | 'planned' | 'empty'; item?: IGMediaItem; assetId?: string }> = [
    ...gridSlots.map((sid, i) =>
      sid
        ? { type: 'planned' as const, assetId: sid }
        : { type: 'empty' as const }
    ).filter((s) => s.type !== 'empty' || true),
    ...mediaItems.map((m) => ({ type: 'real' as const, item: m })),
  ].slice(0, 30);

  const assetMap = useMemo(() => {
    const m = new Map<string, GalleryAsset>();
    plannedAssets.forEach((a) => m.set(a.id, a));
    return m;
  }, [plannedAssets]);

  return (
    <div className="flex flex-col" style={{ background: '#fff', minHeight: '100%' }}>
      {/* Nav bar */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ background: '#fff', borderBottom: '0.5px solid #dbdbdb' }}>
        <ArrowLeft className="w-5 h-5 text-black" />
        <span className="text-[13px] font-bold text-black">{handle}</span>
        <div className="flex items-center gap-3">
          <Plus className="w-5 h-5 text-black" />
          <MoreHorizontal className="w-5 h-5 text-black" />
        </div>
      </div>

      {/* Profile header */}
      <div className="px-4 pt-3 pb-2">
        {/* Avatar + stats row */}
        <div className="flex items-center gap-4 mb-3">
          {/* Avatar with story ring */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full p-[2.5px]"
              style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
              <div className="w-full h-full rounded-full overflow-hidden" style={{ background: '#ddd' }}>
                <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-xl text-white font-bold">
                  {modelName[0]}
                </div>
              </div>
            </div>
          </div>
          {/* Stats */}
          <div className="flex-1 grid grid-cols-3 text-center">
            {[
              { label: 'Posts', val: String(postsCount) },
              { label: 'Followers', val: followerCount },
              { label: 'Following', val: followingCount },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-[13px] font-bold text-black leading-tight">{val}</p>
                <p className="text-[10px] text-black">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        <p className="text-[11px] font-bold text-black leading-tight">{modelName}</p>
        <p className="text-[10px] text-black mt-0.5 leading-snug">
          ✨ Content creator · Link in bio 🔗{'\n'}New drops daily 🔥
        </p>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2.5">
          {['Edit profile', 'Share profile'].map((btn) => (
            <button key={btn} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-black"
              style={{ background: '#efefef' }}>{btn}</button>
          ))}
          <button className="w-8 h-7 rounded-lg flex items-center justify-center" style={{ background: '#efefef' }}>
            <UserCheck className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </div>

      {/* Story highlights */}
      <div className="px-4 py-2">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {['New✨', 'Gym', 'Travel', 'BTS', 'Faves'].map((name) => (
            <div key={name} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-11 h-11 rounded-full p-[1.5px]" style={{ background: '#dbdbdb' }}>
                <div className="w-full h-full rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400" />
                </div>
              </div>
              <span className="text-[9px] text-black text-center max-w-[44px] truncate">{name}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ border: '1px dashed #dbdbdb' }}>
              <Plus className="w-4 h-4 text-black" />
            </div>
            <span className="text-[9px] text-black">New</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ borderTop: '0.5px solid #dbdbdb', borderBottom: '0.5px solid #dbdbdb' }}>
        {[
          { id: 'grid', Icon: Grid3X3 },
          { id: 'reels', Icon: Clapperboard },
          { id: 'tagged', Icon: BookMarked },
        ].map(({ id, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className="flex-1 py-2.5 flex items-center justify-center"
            style={{ borderBottom: activeTab === id ? '1px solid #000' : '1px solid transparent' }}
          >
            <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: activeTab === id ? '#000' : '#8e8e8e' }} />
          </button>
        ))}
      </div>

      {/* Photo grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-800 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3" style={{ gap: 1.5 }}>
          {combinedGrid.map((cell, idx) => {
            const isDragOver = dragOverSlot === idx;
            const isPlanned = cell.type === 'planned';
            const isEmpty = cell.type === 'empty';
            const asset = isPlanned && cell.assetId ? assetMap.get(cell.assetId) : null;
            const imgUrl = isPlanned
              ? asset?.fileUrl
              : cell.item?.media_url ?? cell.item?.thumbnail_url ?? '/demo-image.jpg';

            return (
              <div
                key={idx}
                onDragOver={(e) => { e.preventDefault(); onDragOver(idx); }}
                onDragLeave={onDragLeave}
                onDrop={() => onDropToSlot(idx)}
                className="relative aspect-square overflow-hidden"
                style={{
                  background: isEmpty ? '#fafafa' : '#e5e5e5',
                  outline: isDragOver ? '2px solid #7C3AED' : 'none',
                  outlineOffset: -2,
                }}
              >
                {imgUrl && !isEmpty ? (
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                ) : isEmpty ? (
                  <div className="w-full h-full flex items-center justify-center">
                    {isDragOver
                      ? <div className="w-6 h-6 rounded-full" style={{ background: 'rgba(124,58,237,0.3)' }} />
                      : <div className="w-4 h-4 rounded border border-dashed" style={{ borderColor: '#dbdbdb' }} />
                    }
                  </div>
                ) : null}

                {/* Reel/Video indicator */}
                {cell.item?.media_type === 'VIDEO' && (
                  <div className="absolute top-1.5 right-1.5">
                    <Clapperboard className="w-3 h-3 text-white drop-shadow-md" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
                  </div>
                )}
                {/* Carousel indicator */}
                {cell.item?.media_type === 'CAROUSEL_ALBUM' && (
                  <div className="absolute top-1.5 right-1.5">
                    <Copy className="w-3 h-3 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
                  </div>
                )}
                {/* Planned badge */}
                {isPlanned && (
                  <div className="absolute inset-0 flex items-end justify-start p-1"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)' }}>
                    <span className="text-[7px] font-bold px-1 py-0.5 rounded text-white" style={{ background: 'rgba(124,58,237,0.85)' }}>NEW</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TikTok Profile Page ──────────────────────────────────────────────────────

interface TikTokProfileProps {
  modelName: string;
  posts: Post[];
  plannedAssets: GalleryAsset[];
  gridSlots: (string | null)[];
  dragOverSlot: number | null;
  onDropToSlot: (i: number) => void;
  onDragOver: (i: number) => void;
  onDragLeave: () => void;
}

function TikTokProfilePage({
  modelName, posts, plannedAssets, gridSlots,
  dragOverSlot, onDropToSlot, onDragOver, onDragLeave,
}: TikTokProfileProps) {
  const [activeTab, setActiveTab] = useState<'videos' | 'liked' | 'saved'>('videos');
  const handle = modelName.toLowerCase().replace(/\s+/g, '');

  const assetMap = useMemo(() => {
    const m = new Map<string, GalleryAsset>();
    plannedAssets.forEach((a) => m.set(a.id, a));
    return m;
  }, [plannedAssets]);

  const tiktokPosts = posts.filter((p) => p.platform === 'tiktok').slice(0, 21);

  type GridCell = { type: 'planned'; assetId: string } | { type: 'real'; post: Post } | { type: 'empty' };

  // Merge planned slots at the top
  const combinedGrid: GridCell[] = [
    ...gridSlots.filter(Boolean).map((sid): GridCell => ({ type: 'planned', assetId: sid! })),
    ...tiktokPosts.map((p): GridCell => ({ type: 'real', post: p })),
  ].slice(0, 21);

  // Pad to fill rows of 3
  while (combinedGrid.length % 3 !== 0) {
    combinedGrid.push({ type: 'empty' });
  }

  const mockViews = ['1.2M', '847K', '2.4M', '334K', '5.1M', '92K', '1.8M', '412K', '3.3M', '740K', '1.1M', '268K', '4.7M', '880K', '655K', '2.1M', '490K', '1.4M', '830K', '310K', '2.9M'];

  return (
    <div className="flex flex-col" style={{ background: '#fff', minHeight: '100%' }}>
      {/* Nav */}
      <div className="flex items-center justify-between px-4 py-2.5 sticky top-0 z-10" style={{ background: '#fff' }}>
        <ArrowLeft className="w-5 h-5 text-black" />
        <span className="text-[13px] font-bold text-black">@{handle}</span>
        <div className="flex items-center gap-3">
          <Share2 className="w-4.5 h-4.5 text-black" style={{ width: 18, height: 18 }} />
          <MoreHorizontal className="w-5 h-5 text-black" />
        </div>
      </div>

      {/* Profile section */}
      <div className="flex flex-col items-center px-4 pt-2 pb-4">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full overflow-hidden mb-2"
          style={{ border: '2px solid #f0f0f0' }}>
          <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-3xl text-white font-bold">
            {modelName[0]}
          </div>
        </div>
        <p className="text-[14px] font-bold text-black mb-0.5">@{handle}</p>
        <p className="text-[11px] text-gray-500 mb-3">{modelName}</p>

        {/* Stats */}
        <div className="flex gap-6 mb-3">
          {[
            { val: '312', label: 'Following' },
            { val: '128.4K', label: 'Followers' },
            { val: '2.1M', label: 'Likes' },
          ].map(({ val, label }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-[14px] font-bold text-black">{val}</span>
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Follow / Message buttons */}
        <div className="flex gap-2 w-full">
          <button className="flex-1 py-2 rounded-md text-[12px] font-bold text-white"
            style={{ background: '#FE2C55' }}>Follow</button>
          <button className="flex-1 py-2 rounded-md text-[12px] font-semibold text-black"
            style={{ background: '#f1f1f2', border: '1px solid #e5e5e5' }}>Message</button>
          <button className="w-10 flex items-center justify-center rounded-md"
            style={{ background: '#f1f1f2', border: '1px solid #e5e5e5' }}>
            <ChevronRight className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Bio */}
        <p className="text-[10px] text-black text-center mt-2 leading-snug">
          ✨ Content creator · New videos daily 🔥
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ borderTop: '0.5px solid #f0f0f0', borderBottom: '0.5px solid #f0f0f0' }}>
        {[
          { id: 'videos', label: 'Videos' },
          { id: 'liked', label: 'Liked' },
          { id: 'saved', label: 'Saved' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className="flex-1 py-2.5 text-[11px] font-semibold transition-colors"
            style={{
              color: activeTab === id ? '#000' : '#8e8e8e',
              borderBottom: activeTab === id ? '1.5px solid #FE2C55' : '1.5px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Video grid (3-col portrait) */}
      <div className="grid grid-cols-3" style={{ gap: 1 }}>
        {combinedGrid.map((cell, idx) => {
          const isDragOver = dragOverSlot === idx;
          const isPlanned = cell.type === 'planned';
          const isEmpty = cell.type === 'empty';
          const asset = isPlanned ? assetMap.get(cell.assetId!) : null;
          const imgUrl = isPlanned
            ? asset?.fileUrl
            : (cell as { post: Post }).post?.assets[0]?.fileUrl ?? '/demo-image.jpg';

          return (
            <div
              key={idx}
              onDragOver={(e) => { e.preventDefault(); onDragOver(idx); }}
              onDragLeave={onDragLeave}
              onDrop={() => onDropToSlot(idx)}
              className="relative overflow-hidden"
              style={{
                aspectRatio: '9/16',
                background: '#f1f1f2',
                outline: isDragOver ? '2px solid #FE2C55' : 'none',
                outlineOffset: -2,
              }}
            >
              {!isEmpty && imgUrl ? (
                <img src={imgUrl} alt="" className="w-full h-full object-cover" />
              ) : isEmpty ? (
                <div className="w-full h-full flex items-center justify-center">
                  {isDragOver
                    ? <div className="w-5 h-5 rounded-full bg-red-500/30" />
                    : <div className="w-3.5 h-3.5 rounded border border-dashed border-gray-300" />
                  }
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900" />
              )}

              {/* View count overlay */}
              {!isEmpty && !isPlanned && (
                <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                  <Play className="w-2.5 h-2.5 text-white fill-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
                  <span className="text-[9px] font-semibold text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                    {mockViews[idx % mockViews.length]}
                  </span>
                </div>
              )}
              {/* Planned badge */}
              {isPlanned && (
                <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded text-[7px] font-bold text-white" style={{ background: '#FE2C55' }}>NEW</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Threads Profile ──────────────────────────────────────────────────────────

function ThreadsProfilePage({ modelName, posts }: { modelName: string; posts: Post[] }) {
  const handle = modelName.toLowerCase().replace(/\s+/g, '_');
  const threadsPosts = posts.filter((p) => p.platform === 'threads').slice(0, 5);

  return (
    <div className="flex flex-col" style={{ background: '#fff', minHeight: '100%' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <ArrowLeft className="w-5 h-5 text-black" />
        <MoreHorizontal className="w-5 h-5 text-black" />
      </div>

      {/* Profile */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[16px] font-bold text-black">{modelName}</p>
            <p className="text-[13px] text-black">@{handle}</p>
          </div>
          <div className="w-14 h-14 rounded-full overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-2xl text-white font-bold">
              {modelName[0]}
            </div>
          </div>
        </div>
        <p className="text-[12px] text-black mb-3">Content creator · New drops daily ✨</p>
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[12px] text-gray-500">47.2K followers</span>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-black" style={{ border: '1px solid #dbdbdb' }}>Follow</button>
          <button className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-black" style={{ border: '1px solid #dbdbdb' }}>Mention</button>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid #dbdbdb' }} />

      {/* Thread posts */}
      {threadsPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-[13px] font-bold text-black">No threads yet</p>
          <p className="text-[11px] text-gray-500">Scheduled threads will appear here</p>
        </div>
      ) : (
        threadsPosts.map((post) => (
          <div key={post.id} className="px-4 py-3" style={{ borderBottom: '0.5px solid #f0f0f0' }}>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-xs text-white font-bold">
                  {modelName[0]}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-bold text-black">{handle}</span>
                  <span className="text-[10px] text-gray-400">{format(parseISO(post.scheduledTime), 'MMM d')}</span>
                </div>
                <p className="text-[11px] text-black leading-relaxed mb-2">{post.description}</p>
                {post.assets[0] && (
                  <div className="rounded-xl overflow-hidden mb-2" style={{ maxHeight: 120 }}>
                    <img src={post.assets[0].fileUrl} alt="" className="w-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-4 text-gray-400">
                  <Heart className="w-4 h-4" />
                  <MessageCircle className="w-4 h-4" />
                  <Repeat2 className="w-4 h-4" />
                  <Share2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── X Profile ────────────────────────────────────────────────────────────────

function XProfilePage({ modelName, posts }: { modelName: string; posts: Post[] }) {
  const handle = modelName.toLowerCase().replace(/\s+/g, '');
  const xPosts = posts.filter((p) => p.platform === 'x').slice(0, 5);

  return (
    <div className="flex flex-col" style={{ background: '#000', minHeight: '100%' }}>
      {/* Nav */}
      <div className="flex items-center gap-4 px-4 py-3">
        <ArrowLeft className="w-5 h-5 text-white" />
        <div>
          <p className="text-[14px] font-bold text-white">{modelName}</p>
          <p className="text-[10px] text-gray-500">{xPosts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, #1a1a2e, #7C3AED)' }}>
        <div className="absolute -bottom-7 left-4 w-14 h-14 rounded-full overflow-hidden" style={{ border: '3px solid #000' }}>
          <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-2xl text-white font-bold">
            {modelName[0]}
          </div>
        </div>
        <div className="absolute bottom-2 right-3">
          <button className="px-4 py-1.5 rounded-full text-[11px] font-bold text-white" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>Follow</button>
        </div>
      </div>

      <div className="px-4 pt-10 pb-3">
        <p className="text-[14px] font-bold text-white">{modelName}</p>
        <p className="text-[12px] text-gray-500 mb-2">@{handle}</p>
        <p className="text-[11px] text-gray-300 mb-2">Content creator ✨ New drops daily 🔥</p>
        <div className="flex gap-4">
          <span className="text-[11px] text-gray-400"><span className="font-bold text-white">312</span> Following</span>
          <span className="text-[11px] text-gray-400"><span className="font-bold text-white">47.2K</span> Followers</span>
        </div>
      </div>

      {/* Posts */}
      <div style={{ borderTop: '0.5px solid #333' }}>
        {xPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-[13px] font-bold text-white">No posts yet</p>
            <p className="text-[11px] text-gray-500">Scheduled X posts will appear here</p>
          </div>
        ) : (
          xPosts.map((post) => (
            <div key={post.id} className="px-4 py-3" style={{ borderBottom: '0.5px solid #333' }}>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-xs text-white font-bold">
                    {modelName[0]}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-bold text-white">{modelName}</span>
                    <span className="text-[10px] text-gray-500">@{handle}</span>
                    <span className="text-[10px] text-gray-500">·</span>
                    <span className="text-[10px] text-gray-500">{format(parseISO(post.scheduledTime), 'MMM d')}</span>
                  </div>
                  <p className="text-[11px] text-white leading-relaxed mb-2">{post.description}</p>
                  {post.assets[0] && (
                    <div className="rounded-xl overflow-hidden mb-2" style={{ maxHeight: 100 }}>
                      <img src={post.assets[0].fileUrl} alt="" className="w-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-5 text-gray-500">
                    <div className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /><span className="text-[9px]">24</span></div>
                    <div className="flex items-center gap-1"><Repeat2 className="w-3.5 h-3.5" /><span className="text-[9px]">156</span></div>
                    <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /><span className="text-[9px]">2.1K</span></div>
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Left Panel: Approved Assets ─────────────────────────────────────────────

function ApprovedAssetsPanel({
  assets, selectedId, onSelect, onDragStart,
}: {
  assets: GalleryAsset[]; selectedId: string | null;
  onSelect: (id: string) => void; onDragStart: (id: string) => void;
}) {
  return (
    <aside className="flex flex-col flex-shrink-0 overflow-hidden rounded-xl"
      style={{ width: 248, background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-sm font-bold text-white">Approved</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{assets.length} assets ready</p>
        </div>
        <Link href="/gallery" className="text-[10px] flex items-center gap-1 hover:text-violet-400 transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          <ExternalLink className="w-3 h-3" />Gallery
        </Link>
      </div>

      {assets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
          <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--accent-violet)', opacity: 0.6 }} />
          <div>
            <p className="text-xs font-medium text-white mb-1">No approved assets</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Approve assets in Gallery first</p>
          </div>
          <Link href="/gallery" className="btn-primary text-xs py-1.5 px-3 mt-1">Open Gallery</Link>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onClick={() => onSelect(asset.id)}
                onDragStart={() => onDragStart(asset.id)}
                className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all"
                style={{
                  border: `2px solid ${selectedId === asset.id ? 'rgba(124,58,237,0.8)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: selectedId === asset.id ? '0 0 12px rgba(124,58,237,0.3)' : 'none',
                }}
              >
                <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" draggable={false} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
                {asset.fileType === 'video' && (
                  <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                    <Play className="w-2.5 h-2.5 text-white fill-white" />
                  </div>
                )}
                <div className="absolute bottom-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#ccc' }}>
                  {asset.aspectRatio ? (Math.abs(asset.aspectRatio - 0.5625) < 0.03 ? '9:16' : Math.abs(asset.aspectRatio - 0.8) < 0.03 ? '4:5' : '1:1') : '—'}
                </div>
                <div className="absolute inset-0 hover:bg-violet-500/10 transition-colors rounded-lg" />
              </div>
            ))}
          </div>
          <p className="text-[9px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
            Drag assets onto the grid →
          </p>
        </div>
      )}
    </aside>
  );
}

// ─── Mini Calendar + Quota (right panel) ─────────────────────────────────────

function MiniCalendar({ month, posts, onPrev, onNext, selectedDate, onSelectDate }: {
  month: Date; posts: Post[]; onPrev: () => void; onNext: () => void;
  selectedDate: Date | null; onSelectDate: (d: Date) => void;
}) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstDow = startOfMonth(month).getDay();
  const postCountByDay = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => { const k = format(parseISO(p.scheduledTime), 'yyyy-MM-dd'); map.set(k, (map.get(k) ?? 0) + 1); });
    return map;
  }, [posts]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={onPrev} className="btn-icon w-7 h-7"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-xs font-bold text-white">{format(month, 'MMMM yyyy')}</p>
        <button onClick={onNext} className="btn-icon w-7 h-7"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 mb-0.5">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-semibold py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const count = postCountByDay.get(key) ?? 0;
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const today = isToday(day);
          return (
            <button key={key} onClick={() => onSelectDate(day)}
              className="relative flex flex-col items-center justify-center rounded-lg transition-colors"
              style={{
                background: isSelected ? 'rgba(124,58,237,0.3)' : today ? 'rgba(255,255,255,0.07)' : 'transparent',
                border: isSelected ? '1px solid rgba(124,58,237,0.6)' : '1px solid transparent',
                minHeight: 28,
              }}>
              <span className={`text-[10px] font-medium ${today ? 'text-violet-300' : 'text-zinc-300'}`}>{format(day, 'd')}</span>
              {count > 0 && (
                <div className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: count >= 3 ? '#22c55e' : '#f59e0b' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface QuotaEntry { label: string; scheduled: number; target: number; color: string; }
function QuotaBar({ label, scheduled, target, color }: QuotaEntry) {
  const pct = target > 0 ? Math.min(1, scheduled / target) : 0;
  return (
    <div className="mb-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-zinc-300">{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>
          {scheduled}<span className="text-zinc-600 font-normal">/{target}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: color }} />
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

  const approvedAssets = useMemo(
    () => galleryAssets.filter((a) => approvedAssetIds.includes(a.id)),
    [galleryAssets, approvedAssetIds]
  );

  const modelPosts = useMemo(
    () => posts.filter((p) => p.modelId === selectedModelId)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()),
    [posts, selectedModelId]
  );

  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<Date | null>(null);

  // IG media fetched from Graph API
  const [igMedia, setIgMedia] = useState<IGMediaItem[]>([]);
  const [igLoading, setIgLoading] = useState(false);

  useEffect(() => {
    const conn = selectedModel?.metaConnection;
    if (!conn?.instagramAccountId || !conn?.accessToken) {
      // Fallback: convert modelPosts to IGMediaItem format
      const items: IGMediaItem[] = modelPosts
        .filter((p) => p.platform === 'instagram')
        .map((p) => ({
          id: p.id,
          media_type: REEL_TYPES.has(p.postType) ? 'VIDEO' : p.assets.length > 1 ? 'CAROUSEL_ALBUM' : 'IMAGE',
          media_url: p.assets[0]?.fileUrl,
          timestamp: p.scheduledTime,
          like_count: Math.floor(Math.random() * 5000) + 200,
          comments_count: Math.floor(Math.random() * 300) + 10,
        }));
      setIgMedia(items);
      return;
    }

    setIgLoading(true);
    fetch(`/api/meta/media?accountId=${conn.instagramAccountId}&limit=24`, {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.data) {
          setIgMedia(json.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIgLoading(false));
  }, [selectedModel, modelPosts]);

  // Drag-and-drop
  const [gridSlots, setGridSlots] = useState<(string | null)[]>(Array(30).fill(null));
  const dragAssetRef = useRef<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const handleDragStart = useCallback((assetId: string) => { dragAssetRef.current = assetId; }, []);
  const handleDropToSlot = useCallback((slotIdx: number) => {
    if (!dragAssetRef.current) return;
    setGridSlots((prev) => { const n = [...prev]; n[slotIdx] = dragAssetRef.current; return n; });
    dragAssetRef.current = null;
    setDragOverSlot(null);
  }, []);

  // Quota
  const quotas = useMemo(() => {
    if (!selectedModel) return [];
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthPosts = modelPosts.filter((p) =>
      isWithinInterval(parseISO(p.scheduledTime), { start: monthStart, end: monthEnd })
    );
    return selectedModel.postingFrequency
      .filter((f) => f.enabled)
      .map((freq) => {
        const daysInMonth = monthEnd.getDate();
        const total = freq.postsPerDay * daysInMonth;
        const pp = monthPosts.filter((p) => p.platform === freq.platform);
        const reelR = freq.postTypes.filter((t) => REEL_TYPES.has(t)).length / Math.max(freq.postTypes.length, 1);
        const storyR = freq.postTypes.filter((t) => STORY_TYPES.has(t)).length / Math.max(freq.postTypes.length, 1);
        const postR = 1 - reelR - storyR;
        const entries: QuotaEntry[] = [];
        if (reelR > 0) entries.push({ label: 'Reels', scheduled: pp.filter((p) => REEL_TYPES.has(p.postType)).length, target: Math.round(total * reelR), color: '#e879f9' });
        if (postR > 0) entries.push({ label: 'Posts', scheduled: pp.filter((p) => !REEL_TYPES.has(p.postType) && !STORY_TYPES.has(p.postType)).length, target: Math.round(total * postR), color: '#60a5fa' });
        if (storyR > 0) entries.push({ label: 'Stories', scheduled: pp.filter((p) => STORY_TYPES.has(p.postType)).length, target: Math.round(total * storyR), color: '#fb923c' });
        return { platform: freq.platform, entries };
      });
  }, [selectedModel, modelPosts]);

  const selectedDayPosts = useMemo(() => {
    if (!selectedCalDate) return [];
    return modelPosts.filter((p) => isSameDay(parseISO(p.scheduledTime), selectedCalDate));
  }, [modelPosts, selectedCalDate]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="page-title">Schedule Planner</h1>
          <p className="page-subtitle">Preview your profile grid, plan aesthetic, and track quota progress</p>
        </div>
        <div className="flex items-center gap-2">
          {approvedAssets.length > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent-violet)', border: '1px solid rgba(124,58,237,0.25)' }}>
              {approvedAssets.length} approved
            </span>
          )}
          <Link href="/gallery" className="btn-secondary text-xs flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Gallery
          </Link>
        </div>
      </div>

      {/* 3-Panel */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">

        {/* LEFT */}
        <ApprovedAssetsPanel
          assets={approvedAssets}
          selectedId={null}
          onSelect={() => {}}
          onDragStart={handleDragStart}
        />

        {/* MIDDLE */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden gap-3">
          {/* Platform tabs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] uppercase tracking-wider font-semibold mr-1" style={{ color: 'var(--text-muted)' }}>Platform view</span>
            {PREVIEW_PLATFORMS.map((p) => {
              const theme = PLATFORM_THEMES[p];
              const active = activePlatform === p;
              return (
                <button key={p} onClick={() => setActivePlatform(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#fff' : 'var(--text-muted)',
                  }}>
                  <span>{theme.icon}</span>{theme.label}
                </button>
              );
            })}
          </div>

          {/* Phone + instruction */}
          <div className="flex-1 flex items-start justify-center gap-8 overflow-y-auto no-scrollbar pt-2">
            {/* Phone frame */}
            <PhoneFrame dark={activePlatform === 'tiktok' || activePlatform === 'x'}>
              {activePlatform === 'instagram' && (
                <IGProfilePage
                  modelName={selectedModel?.name ?? 'Creator'}
                  mediaItems={igMedia}
                  plannedAssets={approvedAssets}
                  gridSlots={gridSlots}
                  dragOverSlot={dragOverSlot}
                  onDropToSlot={handleDropToSlot}
                  onDragOver={setDragOverSlot}
                  onDragLeave={() => setDragOverSlot(null)}
                  loading={igLoading}
                />
              )}
              {activePlatform === 'tiktok' && (
                <TikTokProfilePage
                  modelName={selectedModel?.name ?? 'Creator'}
                  posts={modelPosts}
                  plannedAssets={approvedAssets}
                  gridSlots={gridSlots}
                  dragOverSlot={dragOverSlot}
                  onDropToSlot={handleDropToSlot}
                  onDragOver={setDragOverSlot}
                  onDragLeave={() => setDragOverSlot(null)}
                />
              )}
              {activePlatform === 'threads' && (
                <ThreadsProfilePage modelName={selectedModel?.name ?? 'Creator'} posts={modelPosts} />
              )}
              {activePlatform === 'x' && (
                <XProfilePage modelName={selectedModel?.name ?? 'Creator'} posts={modelPosts} />
              )}
            </PhoneFrame>

            {/* Tip card */}
            <div className="flex flex-col gap-3 mt-4 max-w-[200px]">
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[11px] font-bold text-white mb-1">How to use</p>
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  1. Approve assets in Gallery<br />
                  2. Drag them from the left panel<br />
                  3. Drop onto a grid slot<br />
                  4. See how they look live in the profile
                </p>
              </div>
              {selectedModel?.metaConnection?.instagramAccountId ? (
                <div className="rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <p className="text-[10px] font-bold text-green-400 mb-0.5">Live IG Connected</p>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    Showing real posts from Graph API
                  </p>
                </div>
              ) : (
                <div className="rounded-xl p-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <p className="text-[10px] font-bold text-amber-400 mb-0.5">Using scheduled posts</p>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    Connect IG in Settings to pull live grid
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <aside className="flex-shrink-0 flex flex-col overflow-hidden rounded-xl"
          style={{ width: 268, background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
              Schedule Overview
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-5">
            <MiniCalendar
              month={calMonth}
              posts={modelPosts}
              onPrev={() => setCalMonth((m) => subMonths(m, 1))}
              onNext={() => setCalMonth((m) => addMonths(m, 1))}
              selectedDate={selectedCalDate}
              onSelectDate={setSelectedCalDate}
            />

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
                          <p className="text-[10px] font-semibold text-white truncate">{PLATFORM_THEMES[p.platform].label}</p>
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

            {/* Quota */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Monthly Quotas · {format(new Date(), 'MMM')}
              </p>
              {quotas.map(({ platform, entries }) => (
                <div key={platform} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{PLATFORM_THEMES[platform].icon}</span>
                    <p className="text-[11px] font-bold text-white">{PLATFORM_THEMES[platform].label}</p>
                  </div>
                  {entries.map((e) => <QuotaBar key={e.label} {...e} />)}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
