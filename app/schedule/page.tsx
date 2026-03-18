'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin } from '@/lib/mockData';
import { getCachedAssets, setCachedAssets, fetchAllGalleryAssets } from '@/lib/gallery-cache';
import { GalleryAsset, Post, Platform, TimeSlot } from '@/types/models';
import {
  Film, Heart, MessageCircle, Bookmark, ChevronLeft, ChevronRight,
  CheckCircle2, ExternalLink, Share2, Send, Repeat2, MoreHorizontal,
  TrendingUp, CalendarDays, Play, Music2, Grid3X3, Clapperboard,
  Copy, Search, ArrowLeft, Plus, Wifi, Signal, Battery,
  BookMarked, UserCheck, Images, Eye, Clock, AlertTriangle,
  Layers, Smartphone, Link2, X, GripVertical,
} from 'lucide-react';
import Link from 'next/link';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, isToday, parseISO, isWithinInterval,
  startOfWeek, addDays, differenceInCalendarDays, setHours, setMinutes,
  isBefore,
} from 'date-fns';
import { PLATFORM_THEMES } from '@/lib/constants/platform';
import type { PostType } from '@/types/models';
import { InstagramIcon, TikTokIcon, XIcon, ThreadsIcon, FanvueIcon } from '@/components/PlatformIcons';

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

// ─── PanelVideoThumb ─────────────────────────────────────────────────────────

function PanelVideoThumb({ src, fileName }: { src: string; fileName: string }) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShouldLoad(true); obs.disconnect(); } },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full h-full relative bg-zinc-900">
      {shouldLoad && (
        <video
          src={src}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={() => setLoaded(true)}
        />
      )}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-4 h-4 text-zinc-500" />
        </div>
      )}
    </div>
  );
}

// ─── Left Panel: Approved Assets ─────────────────────────────────────────────

interface AssetCarouselGroup {
  id: string;
  assetIds: string[];
}

function ApprovedAssetsPanel({
  assets, selectedId, onSelect, onDragStart, groups, setGroups, onAutoSchedule, r2Loading,
}: {
  assets: GalleryAsset[]; selectedId: string | null;
  onSelect: (id: string) => void; onDragStart: (id: string) => void;
  groups: AssetCarouselGroup[]; setGroups: (g: AssetCarouselGroup[]) => void;
  onAutoSchedule: () => void; r2Loading?: boolean;
}) {
  const [panelWidth, setPanelWidth] = useState(248);
  const [linkMode, setLinkMode] = useState(false);
  const [selectedForGroup, setSelectedForGroup] = useState<Set<string>>(new Set());
  const resizeDragRef = useRef<{ startX: number; startW: number } | null>(null);

  // ── Resize handle ─────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeDragRef.current = { startX: e.clientX, startW: panelWidth };
    const onMove = (ev: MouseEvent) => {
      if (!resizeDragRef.current) return;
      const delta = ev.clientX - resizeDragRef.current.startX;
      setPanelWidth(Math.max(180, Math.min(520, resizeDragRef.current.startW + delta)));
    };
    const onUp = () => {
      resizeDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  // ── Carousel linking ──────────────────────────────────────────────────────
  const toggleForGroup = useCallback((id: string) => {
    setSelectedForGroup((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const createCarousel = useCallback(() => {
    if (selectedForGroup.size < 2) return;
    setGroups([...groups, { id: `g-${Date.now()}`, assetIds: Array.from(selectedForGroup) }]);
    setSelectedForGroup(new Set());
    setLinkMode(false);
  }, [selectedForGroup, groups, setGroups]);

  const ungroupCarousel = useCallback((groupId: string) => {
    setGroups(groups.filter((g) => g.id !== groupId));
  }, [groups, setGroups]);

  const groupedAssetIds = useMemo(() => new Set(groups.flatMap((g) => g.assetIds)), [groups]);
  const ungroupedAssets = useMemo(() => assets.filter((a) => !groupedAssetIds.has(a.id)), [assets, groupedAssetIds]);

  const cols = Math.max(2, Math.floor((panelWidth - 24) / 108));

  const aspectLabel = (ar?: number) => {
    if (!ar) return '—';
    if (Math.abs(ar - 0.5625) < 0.03) return '9:16';
    if (Math.abs(ar - 0.8) < 0.03) return '4:5';
    return '1:1';
  };

  return (
    <aside className="relative flex flex-col flex-shrink-0 overflow-hidden rounded-xl"
      style={{ width: panelWidth, background: 'var(--bg-card)', border: `1px solid ${linkMode ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.07)'}`, transition: 'border-color 0.2s' }}>

      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-sm font-bold text-white">Assets</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {assets.length} assets · {groups.length} carousel{groups.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {assets.length >= 2 && !linkMode && (
            <button
              onClick={() => { setLinkMode(true); setSelectedForGroup(new Set()); }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}
            >
              <Link2 className="w-3 h-3" />Link
            </button>
          )}
          {linkMode && (
            <button
              onClick={() => { setLinkMode(false); setSelectedForGroup(new Set()); }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-semibold"
              style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}
            >
              <X className="w-3 h-3" />Cancel
            </button>
          )}
          {assets.length > 0 && !linkMode && (
            <button
              onClick={onAutoSchedule}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-semibold transition-all"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa' }}
            >
              <CalendarDays className="w-3 h-3" />Auto
            </button>
          )}
          <Link href="/gallery" className="text-[10px] flex items-center gap-1 hover:text-violet-400 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Link mode banner */}
      {linkMode && (
        <div className="flex-shrink-0 px-3 py-2 flex items-center justify-between"
          style={{ background: 'rgba(251,191,36,0.07)', borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
          <p className="text-[10px] font-semibold" style={{ color: '#fbbf24' }}>
            Select {selectedForGroup.size < 2 ? `${2 - selectedForGroup.size} more` : `${selectedForGroup.size} selected`} to link carousel
          </p>
          {selectedForGroup.size >= 2 && (
            <button onClick={createCarousel}
              className="text-[10px] font-bold px-2 py-1 rounded-lg"
              style={{ background: 'rgba(251,191,36,0.25)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }}>
              Create ({selectedForGroup.size})
            </button>
          )}
        </div>
      )}

      {assets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
          {r2Loading ? (
            <>
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-400">Loading assets from vault…</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--accent-violet)', opacity: 0.6 }} />
              <div>
                <p className="text-xs font-medium text-white mb-1">No assets found</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Upload assets in Gallery first</p>
              </div>
              <Link href="/gallery" className="btn-primary text-xs py-1.5 px-3 mt-1">Open Gallery</Link>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>

            {/* Carousel groups */}
            {groups.map((group) => {
              const groupAssets = group.assetIds
                .map((id) => assets.find((a) => a.id === id))
                .filter((a): a is GalleryAsset => !!a);
              const firstAsset = groupAssets[0];
              return (
                <div key={group.id} draggable
                  onDragStart={() => onDragStart(firstAsset?.id ?? group.assetIds[0])}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
                  style={{ border: '2px solid rgba(251,191,36,0.6)', boxShadow: '0 0 10px rgba(251,191,36,0.2)' }}>
                  {/* 2×2 grid of thumbnails */}
                  <div className="grid grid-cols-2 h-full gap-px bg-black">
                    {groupAssets.slice(0, 4).map((a, i) => (
                      <div key={a.id} className="relative overflow-hidden">
                        {a.fileType === 'video'
                          ? <PanelVideoThumb src={a.fileUrl} fileName={a.fileName} />
                          : <img src={a.fileUrl} className="w-full h-full object-cover" alt="" draggable={false} />
                        }
                        {i === 3 && groupAssets.length > 4 && (
                          <div className="absolute inset-0 flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.65)' }}>
                            <span className="text-white text-xs font-bold">+{groupAssets.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Fill empty slots */}
                    {groupAssets.length === 1 && [1, 2, 3].map((i) => (
                      <div key={i} className="bg-zinc-900" />
                    ))}
                    {groupAssets.length === 2 && [1].map((i) => (
                      <div key={i} className="bg-zinc-900 col-span-1 row-span-2" />
                    ))}
                  </div>
                  {/* Carousel badge */}
                  <div className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(251,191,36,0.9)', color: '#000' }}>
                    {groupAssets.length} imgs
                  </div>
                  {/* Ungroup */}
                  <button onClick={(e) => { e.stopPropagation(); ungroupCarousel(group.id); }}
                    className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.85)' }}>
                    <X className="w-3 h-3 text-white" />
                  </button>
                  <div className="absolute inset-0 hover:bg-amber-400/5 transition-colors" />
                </div>
              );
            })}

            {/* Ungrouped single assets */}
            {ungroupedAssets.map((asset) => {
              const isSelected = selectedForGroup.has(asset.id);
              return (
                <div
                  key={asset.id}
                  draggable={!linkMode}
                  onClick={() => linkMode ? toggleForGroup(asset.id) : onSelect(asset.id)}
                  onDragStart={() => !linkMode && onDragStart(asset.id)}
                  className="relative aspect-square rounded-lg overflow-hidden transition-all"
                  style={{
                    cursor: linkMode ? 'pointer' : 'grab',
                    border: `2px solid ${
                      isSelected ? 'rgba(251,191,36,0.8)' :
                      selectedId === asset.id ? 'rgba(124,58,237,0.8)' :
                      'rgba(255,255,255,0.08)'
                    }`,
                    boxShadow: isSelected ? '0 0 12px rgba(251,191,36,0.3)' :
                      selectedId === asset.id ? '0 0 12px rgba(124,58,237,0.3)' : 'none',
                  }}>
                  {asset.fileType === 'video'
                    ? <PanelVideoThumb src={asset.fileUrl} fileName={asset.fileName} />
                    : <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" draggable={false} />
                  }
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
                  {/* Link mode checkbox */}
                  {linkMode && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: isSelected ? 'rgba(251,191,36,0.9)' : 'rgba(0,0,0,0.6)',
                        border: '1.5px solid rgba(251,191,36,0.6)',
                      }}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-black" />}
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(0,0,0,0.7)', color: '#ccc' }}>
                    {aspectLabel(asset.aspectRatio)}
                  </div>
                  <div className="absolute inset-0 hover:bg-violet-500/10 transition-colors rounded-lg" />
                </div>
              );
            })}
          </div>

          {!linkMode && assets.length > 0 && (
            <p className="text-[9px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
              Drag onto grid · Use Link to group carousels
            </p>
          )}
        </div>
      )}

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute top-0 right-0 bottom-0 w-2 flex items-center justify-center group cursor-col-resize z-10"
        style={{ background: 'transparent' }}
      >
        <div className="w-0.5 h-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(124,58,237,0.6)' }} />
      </div>
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

// ─── Best post times (platform strategy data) ─────────────────────────────────

const WEEKLY_TARGETS: Partial<Record<Platform, number>> = {
  instagram: 4, tiktok: 7, x: 5, threads: 5, fanvue: 3,
};

const BEST_TIMES: Partial<Record<Platform, string>> = {
  instagram: '6–9am · 11am–1pm · 7–9pm',
  tiktok: '7–9am · 7–11pm',
  threads: '9–11am · 3–5pm',
  x: '8–10am · 12–1pm · 5–7pm',
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex-1 rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {Icon && <Icon className="w-3 h-3" />}
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
      <p className="text-2xl font-bold leading-none" style={{ color: color ?? '#fff' }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ─── WeeklyTimeline ───────────────────────────────────────────────────────────

const PLATFORM_PILL_COLORS: Partial<Record<Platform, string>> = {
  instagram: '#e1306c',
  tiktok: '#25f4ee',
  x: '#1d9bf0',
  threads: '#888',
  fanvue: '#7C3AED',
};

function WeeklyTimeline({ posts, onDropToDay }: {
  posts: Post[];
  onDropToDay?: (date: Date) => void;
}) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  return (
    <div className="rounded-xl overflow-hidden flex-shrink-0"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-bold text-white flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-violet-400" />
          Weekly Timeline · {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Color = platform · shape = type (▶ reel · ◉ story · ▪ post)
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1.5 p-3">
        {days.map((day) => {
          const dayPosts = posts.filter((p) => isSameDay(parseISO(p.scheduledTime), day));
          const isCurrentDay = isToday(day);
          const isPastDay = day < today && !isCurrentDay;
          const hasGap = dayPosts.length === 0;

          const dayKey = format(day, 'yyyy-MM-dd');
          const isDragOver = dragOverDay === dayKey;

          return (
            <div key={day.toISOString()}
              className="flex flex-col gap-1 p-2 rounded-lg min-h-[128px] transition-all"
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(dayKey); }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={(e) => { e.preventDefault(); setDragOverDay(null); onDropToDay?.(day); }}
              style={{
                background: isDragOver
                  ? 'rgba(124,58,237,0.15)'
                  : isCurrentDay ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${
                  isDragOver
                    ? 'rgba(124,58,237,0.6)'
                    : isCurrentDay
                    ? 'rgba(124,58,237,0.35)'
                    : hasGap && !isPastDay
                    ? 'rgba(251,191,36,0.25)'
                    : 'rgba(255,255,255,0.05)'
                }`,
                cursor: onDropToDay ? 'copy' : undefined,
              }}>
              {/* Day header */}
              <div className="flex flex-col items-center mb-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}>
                  {format(day, 'EEE')}
                </span>
                <span className={`text-sm font-bold leading-tight ${
                  isCurrentDay ? 'text-violet-400' : isPastDay ? 'text-zinc-600' : 'text-white'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Gap badge */}
              {hasGap && !isPastDay && (
                <div className="flex items-center justify-center flex-1">
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                    GAP
                  </span>
                </div>
              )}

              {/* Post pills */}
              {dayPosts.slice(0, 6).map((p) => {
                const color = PLATFORM_PILL_COLORS[p.platform] ?? '#888';
                const symbol = REEL_TYPES.has(p.postType) ? '▶' : STORY_TYPES.has(p.postType) ? '◉' : '▪';
                return (
                  <div key={p.id}
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-semibold truncate"
                    style={{ background: color + '22', color }}>
                    <span>{symbol}</span>
                    <span className="truncate">{format(parseISO(p.scheduledTime), 'h:mma')}</span>
                  </div>
                );
              })}
              {dayPosts.length > 6 && (
                <p className="text-[8px] text-center" style={{ color: 'var(--text-muted)' }}>
                  +{dayPosts.length - 6}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── UpcomingQueue ────────────────────────────────────────────────────────────

function UpcomingQueue({ posts }: { posts: Post[] }) {
  const upcoming = useMemo(() => {
    const now = new Date();
    return posts
      .filter((p) => parseISO(p.scheduledTime) > now)
      .slice(0, 7);
  }, [posts]);

  return (
    <div className="rounded-xl overflow-hidden h-full flex flex-col"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-bold text-white flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-violet-400" />
          Upcoming Queue
        </p>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1.5">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <p className="text-[11px] text-zinc-500">No upcoming posts scheduled</p>
          </div>
        ) : upcoming.map((p) => {
          const thumbUrl = p.assets[0]?.fileUrl;
          const noCaption = !p.description?.trim();
          const color = PLATFORM_PILL_COLORS[p.platform] ?? '#888';
          return (
            <div key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                {thumbUrl ? (
                  <img src={thumbUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Images className="w-4 h-4 text-zinc-600" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="text-[10px] font-bold text-white">
                    {PLATFORM_THEMES[p.platform].label}
                  </span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: color + '22', color }}>
                    {REEL_TYPES.has(p.postType) ? 'Reel' : STORY_TYPES.has(p.postType) ? 'Story' : 'Post'}
                  </span>
                  {noCaption && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                      No caption
                    </span>
                  )}
                </div>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {format(parseISO(p.scheduledTime), 'EEE MMM d · h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PlatformHealthGrid ───────────────────────────────────────────────────────

function PlatformHealthGrid({ posts, enabledPlatforms }: {
  posts: Post[]; enabledPlatforms: Platform[];
}) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const weekPosts = posts.filter((p) => {
    const d = parseISO(p.scheduledTime);
    return d >= weekStart && d <= weekEnd;
  });

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
          Platform Health · This Week
        </p>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {enabledPlatforms.map((platform) => {
          const target = WEEKLY_TARGETS[platform] ?? 5;
          const count = weekPosts.filter((p) => p.platform === platform).length;
          const pct = Math.min(count / target, 1);
          const color = pct >= 0.8 ? '#4ade80' : pct >= 0.5 ? '#fbbf24' : '#f87171';
          const theme = PLATFORM_THEMES[platform];
          const bestTime = BEST_TIMES[platform];

          return (
            <div key={platform} className="p-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <theme.icon size={12} />
                  <span className="text-[10px] font-bold text-white">{theme.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color }}>{count}/{target}</span>
              </div>
              <div className="h-1.5 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct * 100}%`, background: color }} />
              </div>
              {bestTime && (
                <p className="text-[8px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Peak: {bestTime}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Auto-schedule algorithm ──────────────────────────────────────────────────

/** US East Coast default peak hours, sorted by typical engagement */
const DEFAULT_PEAK_HOURS = [20, 21, 19, 12, 13, 7, 8, 18, 11, 17];

/** Parse the Meta `online_followers` insight value map and return hours
 *  sorted descending by average follower activity. */
function parsePeakHours(onlineFollowersData: unknown): number[] {
  try {
    const data = (onlineFollowersData as { data?: Array<{ values?: Array<{ value: Record<string, number> }> }> }).data;
    if (!data?.[0]?.values?.length) return DEFAULT_PEAK_HOURS;
    // Average across all sampled days
    const totals: Record<string, number> = {};
    const dayCount = data[0].values.length;
    for (const entry of data[0].values) {
      for (const [hour, count] of Object.entries(entry.value ?? {})) {
        totals[hour] = (totals[hour] ?? 0) + count;
      }
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([h]) => parseInt(h, 10));
  } catch {
    return DEFAULT_PEAK_HOURS;
  }
}

/** Is this asset (or group) suited for a video slot? */
function isVideoAsset(a: GalleryAsset | null): boolean {
  return a?.fileType === 'video';
}

/** Determine the best PostType for an asset on a platform */
function pickPostType(
  isVideo: boolean,
  isCarousel: boolean,
  platform: Platform,
  slotTypes: import('@/types/models').PostType[],
): import('@/types/models').PostType {
  const REEL_SLOT: Partial<Record<Platform, import('@/types/models').PostType>> = {
    instagram: 'instagram_reel',
    tiktok: 'tiktok_reel',
  };
  const POST_SLOT: Partial<Record<Platform, import('@/types/models').PostType>> = {
    instagram: 'instagram_post',
    tiktok: 'tiktok_slideshow',
    x: 'x_post',
    threads: 'threads_post',
    fanvue: 'fanvue_post',
  };
  if (isVideo && REEL_SLOT[platform] && slotTypes.includes(REEL_SLOT[platform]!)) {
    return REEL_SLOT[platform]!;
  }
  if (isCarousel && POST_SLOT[platform]) return POST_SLOT[platform]!;
  // Pick first matching type from slot definition
  if (slotTypes.length > 0) return slotTypes[0];
  return POST_SLOT[platform] ?? 'instagram_post';
}

interface ScheduleItem {
  assetId: string;
  extraAssetIds?: string[]; // carousel group
  isVideo: boolean;
  isCarousel: boolean;
}

interface AutoScheduleResult {
  posts: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>[];
  daysUsed: number;
  platformCounts: Partial<Record<Platform, number>>;
}

function buildAutoSchedule(
  items: ScheduleItem[],
  existingPosts: Post[],
  modelId: string,
  schedule: TimeSlot[],
  peakHours: number[],
  daysAhead = 21,
): AutoScheduleResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const platformCounts: Partial<Record<Platform, number>> = {};
  const result: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  let itemIdx = 0;
  let daysUsed = 0;

  // Build a set of already-occupied day+platform+hour combos
  const occupied = new Set(
    existingPosts.map((p) => {
      const d = parseISO(p.scheduledTime);
      return `${format(d, 'yyyy-MM-dd')}_${p.platform}_${d.getHours()}`;
    })
  );

  for (let day = 0; day < daysAhead && itemIdx < items.length; day++) {
    const date = addDays(today, day);
    const dateStr = format(date, 'yyyy-MM-dd');

    // Group schedule slots by platform for this day
    const slotsByPlatform: Partial<Record<Platform, TimeSlot[]>> = {};
    for (const slot of schedule) {
      if (!slotsByPlatform[slot.platform]) slotsByPlatform[slot.platform] = [];
      slotsByPlatform[slot.platform]!.push(slot);
    }

    for (const [platform, slots] of Object.entries(slotsByPlatform) as [Platform, TimeSlot[]][]) {
      for (const slot of slots) {
        if (itemIdx >= items.length) break;

        // Parse the slot time (e.g. "09:00")
        const [slotHour, slotMin] = slot.time.split(':').map(Number);

        // Use peak hours to pick the best available hour near the slot time
        // Strategy: try slot's own hour first, then nearest peak hours
        const candidateHours = [slotHour, ...peakHours.filter((h) => h !== slotHour)];
        let chosenHour: number | null = null;
        for (const h of candidateHours) {
          const key = `${dateStr}_${platform}_${h}`;
          if (!occupied.has(key)) {
            chosenHour = h;
            break;
          }
        }
        if (chosenHour === null) continue; // All hours taken for this platform on this day

        const item = items[itemIdx];
        const slotTypes = slot.postType ? [slot.postType] : [];
        const postType = pickPostType(item.isVideo, item.isCarousel, platform, slotTypes);

        const scheduledDate = setMinutes(setHours(date, chosenHour), slotMin);
        occupied.add(`${dateStr}_${platform}_${chosenHour}`);

        const allAssetIds = [item.assetId, ...(item.extraAssetIds ?? [])];
        result.push({
          modelId,
          platform,
          postType,
          scheduledTime: scheduledDate.toISOString(),
          status: 'scheduled',
          description: '',
          assets: allAssetIds.map((aid, order) => ({
            id: `asset-${Date.now()}-${order}`,
            postId: '',
            fileUrl: '',
            fileName: aid,
            fileType: (item.isVideo ? 'video' : 'image') as 'image' | 'video',
            order,
          })),
          approvalStatus: 'pending' as const,
        });

        platformCounts[platform] = (platformCounts[platform] ?? 0) + 1;
        itemIdx++;
        daysUsed = Math.max(daysUsed, day + 1);
      }
    }
  }

  return { posts: result, daysUsed, platformCounts };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const {
    models, selectedModelId, setModels, setSelectedModelId,
    currentUser, setCurrentUser, posts, setPosts,
    galleryAssets, setGalleryAssets, approvedAssetIds, setApprovedAssetIds, updatePost,
  } = useStore();

  useEffect(() => {
    setModels(mockModels);
    if (!selectedModelId) setSelectedModelId('4');
    setCurrentUser(mockAdmin);
    setPosts([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load real R2 assets whenever selected model changes ─────────────────
  const [r2Loading, setR2Loading] = useState(false);
  // Use a ref to read approvedAssetIds without adding it as a dependency
  const approvedIdsRef = useRef(approvedAssetIds);
  approvedIdsRef.current = approvedAssetIds;

  useEffect(() => {
    const model = mockModels.find((m) => m.id === selectedModelId);
    if (!model?.s3Folder) return;

    const cached = getCachedAssets(model.id);
    if (cached) {
      setGalleryAssets(cached.assets);
      if (approvedIdsRef.current.length === 0) {
        setApprovedAssetIds(cached.assets.map((a) => a.id));
      }
      if (cached.status === 'fresh') return;
    }

    setR2Loading(true);
    const accumulated: import('@/types/models').GalleryAsset[] = cached?.assets ? [...cached.assets] : [];

    fetchAllGalleryAssets(model.s3Folder, (batch) => {
      accumulated.push(...batch);
      setGalleryAssets([...accumulated]);
      if (approvedIdsRef.current.length === 0) {
        setApprovedAssetIds(accumulated.map((a) => a.id));
      }
    }, cached?.etag ?? null)
      .then(({ allAssets, etag }) => {
        if (allAssets.length > 0) {
          setCachedAssets(model.id, allAssets, etag);
          setGalleryAssets(allAssets);
          if (approvedIdsRef.current.length === 0) {
            setApprovedAssetIds(allAssets.map((a) => a.id));
          }
        }
      })
      .catch(() => {})
      .finally(() => setR2Loading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId]);

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
  const [showPhonePreview, setShowPhonePreview] = useState(false);

  // ─── Audience peak hours (from Meta Insights or US defaults) ─────────────
  const [peakHours, setPeakHours] = useState<number[]>(DEFAULT_PEAK_HOURS);

  useEffect(() => {
    const conn = selectedModel?.metaConnection;
    if (!conn?.instagramAccountId || !conn?.accessToken) return;
    fetch(`/api/meta/insights?accountId=${conn.instagramAccountId}`, {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.onlineFollowers) {
          const parsed = parsePeakHours(json.data.onlineFollowers);
          if (parsed.length > 0) setPeakHours(parsed);
        }
      })
      .catch(() => {});
  }, [selectedModel]);

  // ─── Panel asset selection ────────────────────────────────────────────────
  const [selectedPanelAssetId, setSelectedPanelAssetId] = useState<string | null>(null);

  // ─── Auto-schedule state + carousel groups (lifted from panel) ────────────
  const [panelGroups, setPanelGroups] = useState<AssetCarouselGroup[]>([]);
  const [autoSchedulePreview, setAutoSchedulePreview] = useState<AutoScheduleResult | null>(null);

  const handleAutoSchedule = useCallback(() => {
    if (!selectedModel) return;
    const groupedIds = new Set(panelGroups.flatMap((g) => g.assetIds));
    const items: ScheduleItem[] = [
      ...panelGroups.map((g) => ({
        assetId: g.assetIds[0],
        extraAssetIds: g.assetIds.slice(1),
        isVideo: false,
        isCarousel: true,
      })),
      ...approvedAssets
        .filter((a) => !groupedIds.has(a.id))
        .map((a) => ({
          assetId: a.id,
          isVideo: a.fileType === 'video',
          isCarousel: false,
        })),
    ];
    if (items.length === 0) return;
    const result = buildAutoSchedule(
      items,
      modelPosts,
      selectedModel.id,
      selectedModel.postingSchedule,
      peakHours,
    );
    setAutoSchedulePreview(result);
  }, [selectedModel, panelGroups, approvedAssets, modelPosts, peakHours]);

  const confirmAutoSchedule = useCallback(() => {
    if (!autoSchedulePreview) return;
    const newPosts: Post[] = autoSchedulePreview.posts.map((p, i) => ({
      ...p,
      id: `auto-${Date.now()}-${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setPosts([...posts, ...newPosts]);
    setAutoSchedulePreview(null);
  }, [autoSchedulePreview, posts, setPosts]);

  // ─── Drop to timeline day (manual scheduling) ─────────────────────────────
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null);

  const handleDropToTimeline = useCallback((day: Date) => {
    const assetId = draggingAssetId;
    if (!assetId || !selectedModel) return;

    const asset = galleryAssets.find((a) => a.id === assetId);
    if (!asset) return;

    // Find the next available slot on this day using postingSchedule
    const dayStr = format(day, 'yyyy-MM-dd');
    const occupiedHours = new Set(
      posts
        .filter((p) => p.modelId === selectedModel.id && format(parseISO(p.scheduledTime), 'yyyy-MM-dd') === dayStr)
        .map((p) => parseISO(p.scheduledTime).getHours())
    );

    // Pick best available peak hour
    const candidateHours = [...peakHours, ...Array.from({ length: 24 }, (_, i) => i)];
    const chosenHour = candidateHours.find((h) => !occupiedHours.has(h)) ?? 12;

    // Determine platform from first enabled slot
    const firstSlot = selectedModel.postingSchedule[0];
    const platform: Platform = firstSlot?.platform ?? 'instagram';
    const postType = pickPostType(asset.fileType === 'video', false, platform, firstSlot ? [firstSlot.postType] : []);

    const scheduledDate = setMinutes(setHours(day, chosenHour), 0);
    const newPost: Post = {
      id: `manual-${Date.now()}`,
      modelId: selectedModel.id,
      platform,
      postType,
      scheduledTime: scheduledDate.toISOString(),
      status: 'scheduled',
      description: '',
      assets: [{ id: `a-${Date.now()}`, postId: '', fileUrl: asset.fileUrl, fileName: asset.fileName, fileType: asset.fileType, order: 0 }],
      approvalStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPosts([...posts, newPost]);
  }, [draggingAssetId, selectedModel, galleryAssets, posts, peakHours, setPosts]);

  // ─── Grid swap (swap scheduledTime of two posts) ──────────────────────────
  const handleGridSwap = useCallback((postIdA: string, postIdB: string) => {
    const a = posts.find((p) => p.id === postIdA);
    const b = posts.find((p) => p.id === postIdB);
    if (!a || !b) return;
    updatePost(postIdA, { scheduledTime: b.scheduledTime });
    updatePost(postIdB, { scheduledTime: a.scheduledTime });
  }, [posts, updatePost]);

  // ─── Stat computations ────────────────────────────────────────────────────

  const enabledPlatforms = useMemo<Platform[]>(() => {
    if (!selectedModel) return ['instagram', 'tiktok'];
    return selectedModel.postingFrequency.filter((f) => f.enabled).map((f) => f.platform);
  }, [selectedModel]);

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const covered = days.filter((d) =>
      modelPosts.some((p) => isSameDay(parseISO(p.scheduledTime), d))
    ).length;
    const futurePosts = modelPosts.filter((p) => parseISO(p.scheduledTime) > now);
    const lastPost = futurePosts.length > 0 ? futurePosts[futurePosts.length - 1] : null;
    const queueDays = lastPost
      ? differenceInCalendarDays(parseISO(lastPost.scheduledTime), now)
      : 0;
    return { covered, queueDays };
  }, [modelPosts]);

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
    const incomingId = dragAssetRef.current;
    setGridSlots((prev) => {
      const n = [...prev];
      // If target slot is occupied by a different asset → swap them
      const existingId = n[slotIdx];
      if (existingId && existingId !== incomingId) {
        // Find where incoming is currently placed and swap
        const fromIdx = n.indexOf(incomingId);
        if (fromIdx !== -1) n[fromIdx] = existingId;
        n[slotIdx] = incomingId;
        // Swap scheduled times of the underlying posts
        const igPosts = modelPosts.filter((p) => p.platform === 'instagram')
          .sort((a, b) => parseISO(a.scheduledTime).getTime() - parseISO(b.scheduledTime).getTime());
        const postA = igPosts[fromIdx];
        const postB = igPosts[slotIdx];
        if (postA && postB) handleGridSwap(postA.id, postB.id);
      } else {
        n[slotIdx] = incomingId;
      }
      return n;
    });
    dragAssetRef.current = null;
    setDragOverSlot(null);
  }, [modelPosts, handleGridSwap]);

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
          <p className="page-subtitle">
            {showPhonePreview
              ? 'Drag approved assets onto the grid to preview your profile aesthetic'
              : 'Weekly coverage, queue depth, and platform health at a glance'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {r2Loading && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Loading vault…
            </span>
          )}
          {approvedAssets.length > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent-violet)', border: '1px solid rgba(124,58,237,0.25)' }}>
              {approvedAssets.length} assets
            </span>
          )}
          <Link href="/gallery" className="btn-secondary text-xs flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Gallery
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">

        {/* LEFT: Approved assets panel */}
        <ApprovedAssetsPanel
          assets={approvedAssets}
          selectedId={selectedPanelAssetId}
          onSelect={(id) => setSelectedPanelAssetId((prev) => prev === id ? null : id)}
          onDragStart={(id) => { handleDragStart(id); setDraggingAssetId(id); }}
          groups={panelGroups}
          setGroups={setPanelGroups}
          onAutoSchedule={handleAutoSchedule}
          r2Loading={r2Loading}
        />

        {showPhonePreview ? (
          /* ── Phone preview mode ── */
          <>
            {/* PHONE COLUMN */}
            <div className="flex flex-col gap-3 overflow-hidden" style={{ width: 380 }}>
              {/* Platform tabs + hide toggle */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <button
                  onClick={() => setShowPhonePreview(false)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.6)', color: '#c4b5fd' }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Planner
                </button>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>|</span>
                {PREVIEW_PLATFORMS.map((p) => {
                  const theme = PLATFORM_THEMES[p];
                  const active = activePlatform === p;
                  return (
                    <button key={p} onClick={() => setActivePlatform(p)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        color: active ? '#fff' : 'var(--text-muted)',
                      }}>
                      <theme.icon size={13} />{theme.label}
                    </button>
                  );
                })}
              </div>
              {/* Phone frame */}
              <div className="flex-1 flex items-start justify-center overflow-y-auto no-scrollbar pt-1">
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
              </div>
            </div>

            {/* CONDENSED OVERVIEW (right column) */}
            <aside className="flex-shrink-0 flex flex-col overflow-hidden rounded-xl"
              style={{ width: 280, background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
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
                    <div className="flex items-center mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {format(selectedCalDate, 'MMM d')} · {selectedDayPosts.length} post{selectedDayPosts.length !== 1 ? 's' : ''}
                      </p>
                      {selectedDayPosts.length > 0 && (
                        <button
                          onClick={() => setPosts(posts.filter((p) => !isSameDay(parseISO(p.scheduledTime), selectedCalDate!)))}
                          className="text-[9px] text-zinc-600 hover:text-red-400 transition-colors ml-auto"
                        >
                          Clear day
                        </button>
                      )}
                    </div>
                    {selectedDayPosts.length === 0 ? (
                      <p className="text-[11px] text-zinc-600">No posts scheduled</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedDayPosts.map((p) => (
                          <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <span>
                              {p.platform === 'instagram' && <InstagramIcon size={13} />}
                              {p.platform === 'tiktok' && <TikTokIcon size={13} />}
                              {p.platform === 'x' && <XIcon size={13} />}
                              {p.platform === 'threads' && <ThreadsIcon size={13} />}
                              {p.platform === 'fanvue' && <FanvueIcon size={13} />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-semibold text-white truncate">
                                {PLATFORM_THEMES[p.platform].label}
                              </p>
                              <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                {format(parseISO(p.scheduledTime), 'h:mm a')} ·{' '}
                                {REEL_TYPES.has(p.postType) ? 'Reel' : STORY_TYPES.has(p.postType) ? 'Story' : 'Post'}
                              </p>
                            </div>
                            <button
                              onClick={() => setPosts(posts.filter((x) => x.id !== p.id))}
                              className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                              title="Remove post"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Quota */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--text-muted)' }}>
                    Monthly Quotas · {format(new Date(), 'MMM')}
                  </p>
                  {quotas.map(({ platform, entries }) => (
                    <div key={platform} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        {platform === 'instagram' && <InstagramIcon size={13} />}
                        {platform === 'tiktok' && <TikTokIcon size={13} />}
                        {platform === 'x' && <XIcon size={13} />}
                        {platform === 'threads' && <ThreadsIcon size={13} />}
                        {platform === 'fanvue' && <FanvueIcon size={13} />}
                        <p className="text-[11px] font-bold text-white">{PLATFORM_THEMES[platform].label}</p>
                      </div>
                      {entries.map((e) => <QuotaBar key={e.label} {...e} />)}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </>
        ) : (
          /* ── Strategy command center (default) ── */
          <div className="flex-1 flex flex-col gap-3 overflow-hidden min-w-0">

            {/* Stat cards + phone toggle */}
            <div className="flex items-stretch gap-3 flex-shrink-0">
              <StatCard
                label="Days covered this week"
                value={`${weeklyStats.covered}/7`}
                sub={weeklyStats.covered >= 6 ? 'Great consistency' : weeklyStats.covered >= 4 ? 'A few gaps' : 'Needs attention'}
                color={weeklyStats.covered >= 6 ? '#4ade80' : weeklyStats.covered >= 4 ? '#fbbf24' : '#f87171'}
                icon={CalendarDays}
              />
              <StatCard
                label="Queue depth"
                value={weeklyStats.queueDays > 0 ? `${weeklyStats.queueDays}d` : 'Empty'}
                sub={weeklyStats.queueDays >= 14 ? 'Well stocked' : weeklyStats.queueDays >= 7 ? 'Running low soon' : 'Needs content now'}
                color={weeklyStats.queueDays >= 14 ? '#4ade80' : weeklyStats.queueDays >= 7 ? '#fbbf24' : '#f87171'}
                icon={Layers}
              />
              <StatCard
                label="Assets ready"
                value={String(approvedAssets.length)}
                sub="approved in gallery"
                icon={Images}
              />
              <button
                onClick={() => setShowPhonePreview(true)}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-2 px-6 rounded-xl border transition-all hover:border-violet-500"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'var(--text-muted)',
                }}
              >
                <Smartphone className="w-5 h-5 text-violet-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Grid preview</span>
              </button>
            </div>

            {/* Weekly timeline */}
            <WeeklyTimeline posts={modelPosts} onDropToDay={handleDropToTimeline} />

            {/* Bottom row: upcoming queue + platform health + quota */}
            <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">

              {/* Upcoming queue */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <UpcomingQueue posts={modelPosts} />
              </div>

              {/* Platform health + quota */}
              <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar flex-shrink-0" style={{ width: 340 }}>
                <PlatformHealthGrid posts={modelPosts} enabledPlatforms={enabledPlatforms} />

                {/* Monthly quota */}
                <div className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                      Monthly Quotas · {format(new Date(), 'MMM')}
                    </p>
                  </div>
                  <div className="p-4 space-y-4">
                    {quotas.map(({ platform, entries }) => (
                      <div key={platform}>
                        <div className="flex items-center gap-2 mb-2">
                          {platform === 'instagram' && <InstagramIcon size={13} />}
                          {platform === 'tiktok' && <TikTokIcon size={13} />}
                          {platform === 'x' && <XIcon size={13} />}
                          {platform === 'threads' && <ThreadsIcon size={13} />}
                          {platform === 'fanvue' && <FanvueIcon size={13} />}
                          <p className="text-[11px] font-bold text-white">{PLATFORM_THEMES[platform].label}</p>
                        </div>
                        {entries.map((e) => <QuotaBar key={e.label} {...e} />)}
                      </div>
                    ))}
                    {quotas.length === 0 && (
                      <p className="text-[11px] text-zinc-600">Configure posting frequency in Settings</p>
                    )}
                  </div>
                </div>

                {/* Calendar */}
                <div className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="p-4">
                    <MiniCalendar
                      month={calMonth}
                      posts={modelPosts}
                      onPrev={() => setCalMonth((m) => subMonths(m, 1))}
                      onNext={() => setCalMonth((m) => addMonths(m, 1))}
                      selectedDate={selectedCalDate}
                      onSelectDate={setSelectedCalDate}
                    />
                    {selectedCalDate && selectedDayPosts.length > 0 && (
                      <div className="mt-3 pt-3 space-y-1.5"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center mb-2">
                          <p className="text-[9px] font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--text-muted)' }}>
                            {format(selectedCalDate, 'MMM d')} · {selectedDayPosts.length} post{selectedDayPosts.length !== 1 ? 's' : ''}
                          </p>
                          {selectedDayPosts.length > 0 && (
                            <button
                              onClick={() => setPosts(posts.filter((p) => !isSameDay(parseISO(p.scheduledTime), selectedCalDate!)))}
                              className="text-[9px] text-zinc-600 hover:text-red-400 transition-colors ml-auto"
                            >
                              Clear day
                            </button>
                          )}
                        </div>
                        {selectedDayPosts.slice(0, 4).map((p) => (
                          <div key={p.id} className="flex items-center gap-2 px-2 py-1 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            {p.platform === 'instagram' && <InstagramIcon size={11} />}
                            {p.platform === 'tiktok' && <TikTokIcon size={11} />}
                            {p.platform === 'x' && <XIcon size={11} />}
                            {p.platform === 'threads' && <ThreadsIcon size={11} />}
                            {p.platform === 'fanvue' && <FanvueIcon size={11} />}
                            <p className="text-[9px] text-white flex-1 truncate">
                              {format(parseISO(p.scheduledTime), 'h:mm a')} ·{' '}
                              {REEL_TYPES.has(p.postType) ? 'Reel' : STORY_TYPES.has(p.postType) ? 'Story' : 'Post'}
                            </p>
                            <button
                              onClick={() => setPosts(posts.filter((x) => x.id !== p.id))}
                              className="w-4 h-4 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                              title="Remove post"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Auto-Schedule Confirmation Modal ── */}
      {autoSchedulePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-6 flex flex-col gap-4 max-w-sm w-full mx-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Auto-Schedule Preview</h2>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {peakHours === DEFAULT_PEAK_HOURS
                    ? 'Using US peak hours — connect IG for personalized times'
                    : "Using your audience's peak activity from Instagram Insights"}
                </p>
              </div>
              <button onClick={() => setAutoSchedulePreview(null)} className="btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-semibold">Posts to create</span>
                <span className="text-lg font-bold text-violet-400">{autoSchedulePreview.posts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-semibold">Days covered</span>
                <span className="text-sm font-bold text-white">{autoSchedulePreview.daysUsed}</span>
              </div>
              <div className="pt-2 space-y-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {(Object.entries(autoSchedulePreview.platformCounts) as [Platform, number][]).map(([p, count]) => (
                  <div key={p} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {p === 'instagram' && <InstagramIcon size={12} />}
                      {p === 'tiktok' && <TikTokIcon size={12} />}
                      {p === 'x' && <XIcon size={12} />}
                      {p === 'threads' && <ThreadsIcon size={12} />}
                      {p === 'fanvue' && <FanvueIcon size={12} />}
                      <span className="text-[11px] text-white">{PLATFORM_THEMES[p].label}</span>
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {count} post{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
              <Clock className="w-3 h-3 flex-shrink-0" />
              Peak windows: {peakHours.slice(0, 3).map((h) => {
                const d = new Date(); d.setHours(h, 0, 0, 0);
                return format(d, 'ha');
              }).join(' · ')}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setAutoSchedulePreview(null)} className="flex-1 btn-secondary text-sm py-2">
                Cancel
              </button>
              <button onClick={confirmAutoSchedule} className="flex-1 btn-primary text-sm py-2">
                Schedule {autoSchedulePreview.posts.length} posts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
