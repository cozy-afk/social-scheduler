'use client';

import { useState, useCallback } from 'react';
import { Post, GalleryAsset } from '@/types/models';
import {
  X,
  Grid3x3,
  Film,
  Heart,
  MessageCircle,
  Share2,
  Music,
  Play,
  Layers,
  Plus,
  Search,
} from 'lucide-react';
import { InstagramIcon, TikTokIcon } from './PlatformIcons';

// ─── Types ────────────────────────────────────────────────────────────

interface FeedPreviewPanelProps {
  modelId: string;
  modelName: string;
  scheduledPosts?: Post[];
  selectedAssets?: GalleryAsset[];
  isOpen: boolean;
  onToggle: () => void;
}

type ActivePlatform = 'instagram' | 'tiktok';

// ─── Helpers ────────────────────────────────────────────────────────────

function buildUsername(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

// Static gradient placeholders for old posts
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

// ─── Instagram Story Highlights ───────────────────────────────────────────

const IG_STORY_HIGHLIGHTS = ['Home', 'Travel', 'Food', 'Style', 'Gym'];

const IG_HIGHLIGHT_GRADIENTS = [
  'from-yellow-400 via-pink-500 to-purple-600',
  'from-orange-400 via-pink-400 to-rose-500',
  'from-green-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-purple-400 to-fuchsia-500',
];

// ─── Instagram Profile View ───────────────────────────────────────────────

function IGProfileView({ modelName, scheduledPosts, selectedAssets }: {
  modelName: string;
  scheduledPosts: Post[];
  selectedAssets?: GalleryAsset[];
}) {
  const username = buildUsername(modelName);
  const allPosts = scheduledPosts.filter(
    (p) => p.platform === 'instagram' &&
      (p.postType === 'instagram_post' || p.postType === 'instagram_reel')
  );

  // Combine scheduled posts with selected gallery assets
  const gridItems = [
    ...allPosts.map((p) => ({
      type: 'post' as const,
      post: p,
    })),
    ...(selectedAssets || []).map((a) => ({
      type: 'asset' as const,
      asset: a,
    })),
  ].slice(0, 9);

  return (
    <div className="bg-white min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <div className="w-6" />
        <button className="flex items-center gap-1 font-semibold text-black text-[13px]">
          @{username}
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
            {([
              [String(allPosts.length), 'Posts'],
              ['24.5K', 'Followers'],
              ['312', 'Following']
            ] as const).map(([val, label]) => (
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
        </div>
      </div>

      {/* Story highlights */}
      <div className="px-3 py-2">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {IG_STORY_HIGHLIGHTS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-[52px] h-[52px] rounded-full p-[2px] bg-gradient-to-tr ${IG_HIGHLIGHT_GRADIENTS[i % IG_HIGHLIGHT_GRADIENTS.length]}`}
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
            className="flex-1 flex items-center justify-center py-2.5 border-b-[2px] border-black text-black"
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-[1.5px]">
        {gridItems.map((item, idx) => (
          <div key={idx} className="relative aspect-square overflow-hidden">
            {item.type === 'post' ? (
              <>
                {item.post.assets?.[0]?.fileUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.post.assets[0].fileUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${OLD_GRADIENTS[idx % OLD_GRADIENTS.length]}`} />
                )}

                {/* Post type icon */}
                {item.post.postType === 'instagram_reel' && (
                  <div className="absolute top-1 right-1">
                    <Play className="w-3.5 h-3.5 text-white drop-shadow-md fill-white" />
                  </div>
                )}
              </>
            ) : (
              <>
                {item.asset.fileUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.asset.fileUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${OLD_GRADIENTS[idx % OLD_GRADIENTS.length]}`} />
                )}

                {/* NEW badge */}
                <div className="absolute top-1 left-1">
                  <span className="bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold leading-none">
                    NEW
                  </span>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Fill with old placeholder posts */}
        {Array.from({ length: Math.max(0, 12 - gridItems.length) }).map((_, i) => (
          <div
            key={`old-${i}`}
            className={`w-full h-full bg-gradient-to-br ${OLD_GRADIENTS[(gridItems.length + i) % OLD_GRADIENTS.length]}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── TikTok View ────────────────────────────────────────────────────────

function TikTokCard({ post, modelName }: { post: Post | GalleryAsset; modelName: string }) {
  const username = buildUsername(modelName);
  const thumbUrl = isGalleryAsset(post) ? post.fileUrl : post.assets?.[0]?.fileUrl;

  // Type guard to distinguish GalleryAsset from Post
  function isGalleryAsset(item: Post | GalleryAsset): item is GalleryAsset {
    return 'fileUrl' in item && !('assets' in item);
  }

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
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 border-2 border-white flex items-center justify-center text-white font-bold text-sm">
          {modelName.charAt(0).toUpperCase()}
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
        <p className="text-white text-[12px] leading-snug line-clamp-2 opacity-90">
          Check out my latest content! #fyp #viral
        </p>
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

function TikTokView({ modelName, scheduledPosts, selectedAssets }: {
  modelName: string;
  scheduledPosts: Post[];
  selectedAssets?: GalleryAsset[];
}) {
  const tiktokPosts = scheduledPosts.filter((p) => p.platform === 'tiktok');
  const displayPosts = [
    ...(tiktokPosts as (Post | GalleryAsset)[]),
    ...(selectedAssets || []),
  ].slice(0, 3);

  return (
    <div className="bg-black min-h-full">
      {displayPosts.length > 0 ? (
        <div className="flex flex-col">
          {displayPosts.map((post, idx) => (
            <TikTokCard key={idx} post={post} modelName={modelName} />
          ))}
        </div>
      ) : (
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

// ─── Phone Frame ───────────────────────────────────────────────────────

function PhoneFrame({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className="mx-auto flex-shrink-0 overflow-hidden"
      style={{
        width: 300,
        height: 600,
        borderRadius: 36,
        background: dark ? '#000' : '#fff',
        border: '6px solid #1a1a1a',
        boxShadow: '0 0 0 1px #333, 0 20px 50px rgba(0,0,0,0.5)',
      }}
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl z-10"
        style={{ background: '#1a1a1a' }} />
      {/* Screen content */}
      <div className="absolute inset-0 top-6 overflow-y-auto no-scrollbar" style={{ borderRadius: 30 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function FeedPreviewPanel({
  modelId,
  modelName,
  scheduledPosts = [],
  selectedAssets,
  isOpen,
  onToggle,
}: FeedPreviewPanelProps) {
  const [activePlatform, setActivePlatform] = useState<ActivePlatform>('instagram');

  const igPosts = scheduledPosts.filter(
    (p) => p.platform === 'instagram' &&
      (p.postType === 'instagram_post' || p.postType === 'instagram_reel')
  );
  const tiktokPosts = scheduledPosts.filter((p) => p.platform === 'tiktok');

  if (!isOpen) return null;

  return (
    <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-t-2xl px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-white">Feed Preview</h3>
          <p className="text-[10px] text-slate-400">
            {modelName} · {activePlatform === 'instagram' ? igPosts.length : tiktokPosts.length} posts
          </p>
        </div>
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Platform toggle */}
      <div className="flex gap-1 bg-slate-900/50 border-x border-t border-slate-700 px-3 pt-2">
        <button
          onClick={() => setActivePlatform('instagram')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
            activePlatform === 'instagram'
              ? 'bg-[#E1306C]/20 border border-[#E1306C]/50 text-white'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <span><InstagramIcon size={14} /></span>
          Instagram
        </button>
        <button
          onClick={() => setActivePlatform('tiktok')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
            activePlatform === 'tiktok'
              ? 'bg-[#FF0050]/20 border border-[#FF0050]/50 text-white'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <span><TikTokIcon size={14} /></span>
          TikTok
        </button>
      </div>

      {/* Phone frame */}
      <div className="flex-1 bg-slate-900/50 border-x border-b border-slate-700 rounded-b-2xl p-4 flex items-center justify-center">
        <PhoneFrame dark={activePlatform === 'tiktok'}>
          {activePlatform === 'instagram' ? (
            <IGProfileView
              modelName={modelName}
              scheduledPosts={scheduledPosts}
              selectedAssets={selectedAssets}
            />
          ) : (
            <TikTokView
              modelName={modelName}
              scheduledPosts={scheduledPosts}
              selectedAssets={selectedAssets}
            />
          )}
        </PhoneFrame>
      </div>
    </div>
  );
}
