'use client';

import { useState, useCallback } from 'react';
import { Post } from '@/types/models';
import {
  X,
  BarChart2,
  Grid3x3,
  Film,
  Layers,
  Heart,
  MessageCircle,
  Share2,
  Music,
  Play,
  ChevronDown,
  Plus,
  Search,
} from 'lucide-react';
import clsx from 'clsx';
import { InstagramIcon, TikTokIcon } from './PlatformIcons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedPreviewModalProps {
  modelId: string;
  modelName: string;
  scheduledPosts: Post[];
  onClose: () => void;
}

type ActivePlatform = 'instagram' | 'tiktok';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUsername(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

// Static gradient placeholders cycling through a palette
const OLD_GRADIENTS = [
  'from-rose-300 to-pink-400',
  'from-violet-300 to-purple-400',
  'from-sky-300 to-blue-400',
  'from-amber-300 to-orange-400',
  'from-emerald-300 to-teal-400',
  'from-pink-200 to-rose-300',
  'from-indigo-300 to-violet-400',
  'from-cyan-300 to-sky-400',
  'from-fuchsia-300 to-pink-400',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Status-bar icons inside the phone notch area */
function StatusBar() {
  return (
    <div className="flex justify-between items-center px-6 pt-2 pb-1 text-white text-[10px] font-semibold select-none">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        {/* signal bars */}
        <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor" className="opacity-90">
          <rect x="0" y="6" width="3" height="4" rx="0.5" />
          <rect x="4.5" y="4" width="3" height="6" rx="0.5" />
          <rect x="9" y="2" width="3" height="8" rx="0.5" />
          <rect x="13.5" y="0" width="2.5" height="10" rx="0.5" opacity="0.35" />
        </svg>
        {/* wifi */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" className="opacity-90">
          <path d="M7 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          <path d="M4 6a4.24 4.24 0 0 1 6 0" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" />
          <path d="M1.5 3.5A7.5 7.5 0 0 1 12.5 3.5" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" />
        </svg>
        {/* battery */}
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none" className="opacity-90">
          <rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke="currentColor" strokeOpacity="0.45" />
          <rect x="1.5" y="1.5" width="14" height="8" rx="1.5" fill="currentColor" />
          <path d="M19.5 3.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
        </svg>
      </div>
    </div>
  );
}

/** Phone frame wrapper */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[320px] bg-gray-950 rounded-[40px] p-[5px] shadow-2xl border-[3px] border-gray-800 flex-shrink-0">
      <div className="bg-black rounded-[36px] overflow-hidden relative">
        {/* notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-20 flex items-center justify-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-800" />
          <div className="w-12 h-1.5 rounded-full bg-gray-800" />
        </div>
        <StatusBar />
        <div className="overflow-y-auto" style={{ height: 580 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Instagram View ───────────────────────────────────────────────────────────

const IG_STORY_HIGHLIGHTS = ['Home', 'Travel', 'Food', 'Style', 'Gym'];

const IG_HIGHLIGHT_GRADIENTS = [
  'from-yellow-400 via-pink-500 to-purple-600',
  'from-orange-400 via-pink-400 to-rose-500',
  'from-green-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-purple-400 to-fuchsia-500',
];

interface IgGridItem {
  type: 'new' | 'old';
  post: Post | null;
  idx: number;
}

function IgGridCell({
  item,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  item: IgGridItem;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const { type, post, idx } = item;
  const isReel = post?.postType === 'instagram_reel';
  const isCarousel = post?.assets && post.assets.length > 1;
  const isCompleted = post?.status === 'completed';
  const thumbUrl = post?.assets?.[0]?.fileUrl;

  return (
    <div
      draggable={type === 'new'}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={clsx(
        'relative aspect-square overflow-hidden',
        type === 'new' && 'cursor-move',
        isDragging && 'opacity-40 scale-95',
      )}
    >
      {type === 'new' && post ? (
        <>
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-400 via-rose-400 to-purple-500" />
          )}

          {/* Completed overlay */}
          {isCompleted && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              </div>
            </div>
          )}

          {/* NEW badge */}
          {!isCompleted && (
            <div className="absolute top-1 left-1">
              <span className="bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold leading-none">
                NEW
              </span>
            </div>
          )}

          {/* Post type icon top-right */}
          <div className="absolute top-1 right-1">
            {isCarousel ? (
              <Layers className="w-3.5 h-3.5 text-white drop-shadow-md" />
            ) : isReel ? (
              <Play className="w-3.5 h-3.5 text-white drop-shadow-md fill-white" />
            ) : null}
          </div>
        </>
      ) : (
        /* Old/placeholder cell */
        <div
          className={clsx(
            'w-full h-full bg-gradient-to-br',
            OLD_GRADIENTS[idx % OLD_GRADIENTS.length],
          )}
        />
      )}
    </div>
  );
}

function InstagramView({
  modelName,
  igScheduled,
  dragIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  modelName: string;
  igScheduled: Post[];
  dragIndex: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'grid' | 'reels' | 'tagged'>('grid');
  const username = buildUsername(modelName);

  const igGrid: IgGridItem[] = [
    ...igScheduled.map((p, i) => ({ type: 'new' as const, post: p, idx: i })),
    ...Array.from({ length: 9 }, (_, i) => ({
      type: 'old' as const,
      post: null,
      idx: igScheduled.length + i,
    })),
  ].slice(0, 12);

  return (
    <div className="bg-white min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <div className="w-6" />
        <button className="flex items-center gap-1 font-semibold text-black text-[13px]">
          @{username}
          <ChevronDown className="w-3.5 h-3.5 text-black" />
        </button>
        <Plus className="w-5 h-5 text-black" />
      </div>

      {/* Profile row */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-4">
          {/* Avatar with story ring */}
          <div className="w-[72px] h-[72px] rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex-shrink-0">
            <div className="w-full h-full rounded-full bg-white p-[2px]">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 font-bold text-xl">
                {modelName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 flex-1 justify-around">
            {([['142', 'Posts'], ['24.5K', 'Followers'], ['312', 'Following']] as const).map(([val, label]) => (
              <div key={label} className="flex flex-col items-center">
                <span className="font-bold text-black text-[13px] leading-tight">{val}</span>
                <span className="text-gray-500 text-[11px] leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Name & bio */}
        <div className="mt-2 space-y-0.5">
          <p className="font-bold text-black text-[13px] leading-tight">{modelName}</p>
          <p className="text-[12px] text-gray-700 italic leading-snug">
            Content creator ✨ Lifestyle &amp; beauty
          </p>
          <p className="text-[12px] text-blue-600 leading-snug">linktr.ee/{username}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2.5">
          <button className="flex-1 bg-gray-100 text-black text-[12px] font-semibold py-1.5 rounded-lg">
            Edit profile
          </button>
          <button className="flex-1 bg-gray-100 text-black text-[12px] font-semibold py-1.5 rounded-lg">
            Share profile
          </button>
          <button className="bg-gray-100 text-black py-1.5 px-2.5 rounded-lg">
            <Search className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </div>

      {/* Story highlights */}
      <div className="px-3 py-2">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {IG_STORY_HIGHLIGHTS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={clsx(
                  'w-[52px] h-[52px] rounded-full p-[2px] bg-gradient-to-tr',
                  IG_HIGHLIGHT_GRADIENTS[i % IG_HIGHLIGHT_GRADIENTS.length],
                )}
              >
                <div className="w-full h-full rounded-full bg-white p-[2px]">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-200 to-slate-300" />
                </div>
              </div>
              <span className="text-[10px] text-black text-center leading-none">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab row */}
      <div className="flex border-t border-gray-200">
        {(
          [
            { id: 'grid', icon: <Grid3x3 className="w-5 h-5" /> },
            { id: 'reels', icon: <Film className="w-5 h-5" /> },
            { id: 'tagged', icon: <Layers className="w-5 h-5" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex-1 flex items-center justify-center py-2.5 border-b-[2px] transition-colors',
              activeTab === tab.id
                ? 'border-black text-black'
                : 'border-transparent text-gray-400',
            )}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-[1.5px]">
        {igGrid.map((item) => (
          <IgGridCell
            key={item.idx}
            item={item}
            isDragging={dragIndex === item.idx}
            onDragStart={() => item.type === 'new' && onDragStart(item.idx)}
            onDragOver={(e) => item.type === 'new' && onDragOver(e, item.idx)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

// ─── TikTok View ──────────────────────────────────────────────────────────────

function TikTokCard({ post, modelName }: { post: Post; modelName: string }) {
  const username = buildUsername(modelName);
  const thumbUrl = post.assets?.[0]?.fileUrl;
  const caption = post.description || 'Check out my latest content! #fyp #viral';

  return (
    <div className="relative w-full flex-shrink-0" style={{ height: 560 }}>
      {/* Background / thumbnail */}
      {thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-black" />
      )}

      {/* Dark scrim for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      {/* Top — For You / Following tabs */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-5 pt-3 pb-2">
        <button className="text-white/60 text-[13px] font-medium">Following</button>
        <div className="flex flex-col items-center gap-0.5">
          <button className="text-white text-[13px] font-semibold">For You</button>
          <div className="w-4 h-[2px] bg-white rounded-full" />
        </div>
      </div>

      {/* Right sidebar */}
      <div className="absolute right-2.5 bottom-16 flex flex-col items-center gap-5">
        {/* Avatar + follow */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 border-2 border-white flex items-center justify-center text-white font-bold text-sm">
            {modelName.charAt(0).toUpperCase()}
          </div>
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center -mt-2.5 border border-black">
            <Plus className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* Heart */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-10 flex items-center justify-center">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-[11px] font-medium">234K</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-10 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-[11px] font-medium">1.2K</span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-10 flex items-center justify-center">
            <Share2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-[11px] font-medium">45K</span>
        </div>

        {/* Music disc */}
        <div className="w-10 h-10 rounded-full bg-gray-800 border-[3px] border-gray-600 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center animate-spin">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-900" />
          </div>
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-14 pb-4 px-3 space-y-1.5">
        <p className="text-white font-bold text-[13px]">@{username}</p>
        <p className="text-white text-[12px] leading-snug line-clamp-2 opacity-90">{caption}</p>
        <div className="flex items-center gap-1.5">
          <Music className="w-3 h-3 text-white" />
          <p className="text-white text-[11px] opacity-80">Original sound — @{username}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
        <div className="h-full bg-white/80 w-2/5 rounded-full" />
      </div>
    </div>
  );
}

function TikTokView({ modelName, tiktokPosts }: { modelName: string; tiktokPosts: Post[] }) {
  const displayPosts = tiktokPosts.length > 0
    ? tiktokPosts.slice(0, 3)
    : null;

  return (
    <div className="bg-black min-h-full">
      {displayPosts ? (
        <div className="flex flex-col">
          {displayPosts.map((post) => (
            <TikTokCard key={post.id} post={post} modelName={modelName} />
          ))}
        </div>
      ) : (
        /* Empty state — still render a plausible looking card */
        <div className="relative" style={{ height: 560 }}>
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-black" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

          <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-5 pt-3 pb-2">
            <button className="text-white/60 text-[13px] font-medium">Following</button>
            <div className="flex flex-col items-center gap-0.5">
              <button className="text-white text-[13px] font-semibold">For You</button>
              <div className="w-4 h-[2px] bg-white rounded-full" />
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Film className="w-10 h-10 text-white/40 mx-auto" />
              <p className="text-white/50 text-sm">No TikTok posts scheduled</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Platform Tab Switcher ────────────────────────────────────────────────────

function PlatformTabs({
  active,
  onChange,
}: {
  active: ActivePlatform;
  onChange: (p: ActivePlatform) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange('instagram')}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all relative',
          active === 'instagram'
            ? 'bg-white/5 border-[#E1306C]/70 text-white'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600',
        )}
      >
        <span><InstagramIcon size={18} /></span>
        Instagram Grid
        {active === 'instagram' && (
          <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-yellow-400 via-[#E1306C] to-[#8134AF] rounded-full" />
        )}
      </button>
      <button
        onClick={() => onChange('tiktok')}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all relative',
          active === 'tiktok'
            ? 'bg-white/5 border-[#FF0050]/70 text-white'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600',
        )}
      >
        <span><TikTokIcon size={18} /></span>
        TikTok Feed
        {active === 'tiktok' && (
          <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-[#FF0050] to-black rounded-full" />
        )}
      </button>
    </div>
  );
}

// ─── Aesthetic Score Bar ──────────────────────────────────────────────────────

function AestheticScore({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-3">
      <BarChart2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Feed Aesthetic Score</span>
          <span className="text-sm font-bold text-blue-400">{score}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function FeedPreviewModal({
  modelId: _modelId,
  modelName,
  scheduledPosts,
  onClose,
}: FeedPreviewModalProps) {
  const [activePlatform, setActivePlatform] = useState<ActivePlatform>('instagram');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [newPostOrder, setNewPostOrder] = useState<Post[]>(() =>
    scheduledPosts.filter(
      (p) =>
        p.platform === 'instagram' &&
        (p.postType === 'instagram_post' || p.postType === 'instagram_reel'),
    ),
  );

  const tiktokPosts = scheduledPosts.filter((p) => p.platform === 'tiktok');
  const aestheticScore = Math.min(99, 72 + newPostOrder.length * 3);

  const handleDragStart = useCallback((idx: number) => setDragIndex(idx), []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === idx) return;
      const reordered = [...newPostOrder];
      const [dragged] = reordered.splice(dragIndex, 1);
      reordered.splice(idx, 0, dragged);
      setNewPostOrder(reordered);
      setDragIndex(idx);
    },
    [dragIndex, newPostOrder],
  );

  const handleDragEnd = useCallback(() => setDragIndex(null), []);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Feed Preview</h2>
            <p className="text-xs text-slate-400">
              Simulate how your feed will look with scheduled posts
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Platform tab switcher */}
          <PlatformTabs active={activePlatform} onChange={setActivePlatform} />

          {/* Phone frame + content */}
          <PhoneFrame>
            {activePlatform === 'instagram' ? (
              <InstagramView
                modelName={modelName}
                igScheduled={newPostOrder}
                dragIndex={dragIndex}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              />
            ) : (
              <TikTokView modelName={modelName} tiktokPosts={tiktokPosts} />
            )}
          </PhoneFrame>

          {/* Aesthetic score — only shown for Instagram */}
          {activePlatform === 'instagram' && <AestheticScore score={aestheticScore} />}

          {/* Drag hint */}
          {activePlatform === 'instagram' && newPostOrder.length > 0 && (
            <p className="text-xs text-slate-400 text-center">
              {newPostOrder.length} new post{newPostOrder.length !== 1 ? 's' : ''} added to the
              grid — drag to reorder for better aesthetics
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
