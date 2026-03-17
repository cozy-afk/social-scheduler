'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin } from '@/lib/mockData';
import { PostReference, CaptionCategory } from '@/types/models';
import {
  TrendingUp, AtSign, Plus, Trash2, RefreshCw, Heart, Eye,
  MessageCircle, Bookmark, ExternalLink, Check, Clock, Zap,
  Film, Image as ImageIcon, LayoutGrid,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Local types ──────────────────────────────────────────────────────────────

type CreatorPlatform = 'instagram' | 'tiktok' | 'both';
type ScrapeStatus = 'idle' | 'scraping' | 'done' | 'error';
type PostKind = 'reel' | 'carousel' | 'image' | 'video';
type NicheTag = 'all' | 'lifestyle' | 'beauty' | 'bikini' | 'gym' | 'lingerie' | 'travel' | 'bts';
type SortKey = 'viral' | 'recent' | 'saves';

interface TrackedCreator {
  id: string;
  handle: string;
  platform: CreatorPlatform;
  addedAt: string;
  lastScrapedAt?: string;
  scrapeStatus: ScrapeStatus;
  postCount: number;
}

interface ViralPost {
  id: string;
  handle: string;
  platform: 'instagram' | 'tiktok';
  postKind: PostKind;
  gradient: string;       // CSS gradient for placeholder thumbnail
  caption: string;        // full caption
  hook: string;           // opening hook line
  likes: number;
  views?: number;
  comments: number;
  saves: number;
  shares: number;
  engagementRate: number; // percentage
  postedAt: string;       // ISO
  niche: NicheTag;
  sourceUrl?: string;
}

// ─── Mock viral post bank ─────────────────────────────────────────────────────

const VIRAL_POST_BANK: ViralPost[] = [
  {
    id: 'vp-1', handle: 'sophiameyer_', platform: 'instagram', postKind: 'reel',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
    hook: 'tell me why every single beach trip ends like this 🌊',
    caption: 'tell me why every single beach trip ends like this 🌊\n\nsun, sand, and zero regrets\n\n#beachvibes #summer #lifestyle #creator',
    likes: 2_410_000, views: 18_300_000, comments: 14_200, saves: 89_000, shares: 42_000, engagementRate: 14.2,
    postedAt: '2025-12-01T14:00:00Z', niche: 'lifestyle',
  },
  {
    id: 'vp-2', handle: 'luna.voss', platform: 'tiktok', postKind: 'video',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    hook: 'POV: you finally matched the energy you deserve ✨',
    caption: 'POV: you finally matched the energy you deserve ✨\n\nstop settling for less than butterflies\n\n#selflove #pov #fyp #viral',
    likes: 4_820_000, views: 62_100_000, comments: 38_900, saves: 210_000, shares: 188_000, engagementRate: 9.8,
    postedAt: '2025-11-28T19:00:00Z', niche: 'lifestyle',
  },
  {
    id: 'vp-3', handle: 'bella.rae', platform: 'instagram', postKind: 'carousel',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    hook: 'morning routine that completely changed my life 🌅',
    caption: 'morning routine that completely changed my life 🌅\n\nswipe for the full breakdown →\n\n#morningroutine #wellness #glow #selfcare',
    likes: 892_000, comments: 7_800, saves: 145_000, shares: 31_000, engagementRate: 18.6,
    postedAt: '2025-11-25T08:00:00Z', niche: 'beauty',
  },
  {
    id: 'vp-4', handle: 'ava.luxe', platform: 'instagram', postKind: 'reel',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    hook: 'not me forgetting I have a link in bio 😇',
    caption: 'not me forgetting I have a link in bio 😇\n\nlink in bio for the full thing 👀\n\n#creator #content #viral #instagram',
    likes: 1_670_000, views: 22_400_000, comments: 21_300, saves: 74_000, shares: 56_000, engagementRate: 11.4,
    postedAt: '2025-11-20T17:30:00Z', niche: 'lifestyle',
  },
  {
    id: 'vp-5', handle: 'mila.creates', platform: 'tiktok', postKind: 'video',
    gradient: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
    hook: 'gym fit check because why not 💪',
    caption: 'gym fit check because why not 💪\n\nlink in bio\n\n#gymgirl #fitcheck #workout #fyp',
    likes: 3_240_000, views: 41_800_000, comments: 29_100, saves: 176_000, shares: 143_000, engagementRate: 10.7,
    postedAt: '2025-11-18T12:00:00Z', niche: 'gym',
  },
  {
    id: 'vp-6', handle: 'zara.model', platform: 'instagram', postKind: 'image',
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #A855F7 100%)',
    hook: 'the look that breaks the internet every time 🔥',
    caption: 'the look that breaks the internet every time 🔥\n\ncheck the link for more 💋\n\n#model #fashion #hot #aesthetic',
    likes: 3_190_000, comments: 18_600, saves: 121_000, shares: 67_000, engagementRate: 22.1,
    postedAt: '2025-11-15T21:00:00Z', niche: 'lifestyle',
  },
  {
    id: 'vp-7', handle: 'chloe.x', platform: 'tiktok', postKind: 'video',
    gradient: 'linear-gradient(135deg, #F97316 0%, #FBBF24 100%)',
    hook: 'bikini szn is year round when you live like this ☀️',
    caption: 'bikini szn is year round when you live like this ☀️\n\nlink in bio for more\n\n#bikini #summer #model #fyp',
    likes: 2_880_000, views: 38_600_000, comments: 24_700, saves: 198_000, shares: 122_000, engagementRate: 12.3,
    postedAt: '2025-11-12T16:00:00Z', niche: 'bikini',
  },
  {
    id: 'vp-8', handle: 'isla.rose', platform: 'instagram', postKind: 'reel',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
    hook: 'me realising confidence is the only outfit that matters 💫',
    caption: 'me realising confidence is the only outfit that matters 💫\n\nyou know where to find me 🔗\n\n#confidence #selflove #glow #creator',
    likes: 1_440_000, views: 19_200_000, comments: 11_800, saves: 93_000, shares: 48_000, engagementRate: 13.8,
    postedAt: '2025-11-10T20:00:00Z', niche: 'lifestyle',
  },
  {
    id: 'vp-9', handle: 'nova.fit', platform: 'tiktok', postKind: 'video',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
    hook: 'hotel room workout when you refuse to skip a day 🏋️‍♀️',
    caption: 'hotel room workout when you refuse to skip a day 🏋️‍♀️\n\nfull programme link in bio\n\n#gymgirl #workout #travel #fyp',
    likes: 1_920_000, views: 27_500_000, comments: 17_400, saves: 241_000, shares: 89_000, engagementRate: 11.9,
    postedAt: '2025-11-08T11:00:00Z', niche: 'gym',
  },
  {
    id: 'vp-10', handle: 'ruby.creator', platform: 'instagram', postKind: 'carousel',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #8B5CF6 100%)',
    hook: 'lingerie haul that actually fits real women 🖤',
    caption: 'lingerie haul that actually fits real women 🖤\n\nswipe for all 6 →  link in bio for the haul list\n\n#lingerie #haul #curve #fashion',
    likes: 2_340_000, comments: 22_100, saves: 318_000, shares: 104_000, engagementRate: 24.7,
    postedAt: '2025-11-05T18:00:00Z', niche: 'lingerie',
  },
  {
    id: 'vp-11', handle: 'paris.vibe', platform: 'tiktok', postKind: 'video',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    hook: 'solo Paris trip as a girl is giving main character energy 🥐',
    caption: 'solo Paris trip as a girl is giving main character energy 🥐\n\nday 1 vlog in full on my page\n\n#paris #travel #solotravel #fyp',
    likes: 5_610_000, views: 78_200_000, comments: 44_300, saves: 312_000, shares: 267_000, engagementRate: 8.9,
    postedAt: '2025-11-03T14:00:00Z', niche: 'travel',
  },
  {
    id: 'vp-12', handle: 'jade.aesthetic', platform: 'instagram', postKind: 'image',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)',
    hook: 'the confidence to wear this comes from knowing 👇',
    caption: 'the confidence to wear this comes from knowing 👇\n\nlink in bio\n\n#bikini #beach #model #creator',
    likes: 4_180_000, comments: 31_200, saves: 187_000, shares: 92_000, engagementRate: 21.4,
    postedAt: '2025-10-30T19:00:00Z', niche: 'bikini',
  },
  {
    id: 'vp-13', handle: 'skye.london', platform: 'instagram', postKind: 'reel',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
    hook: 'behind the scenes of what actually goes into content creation 🎬',
    caption: 'behind the scenes of what actually goes into content creation 🎬\n\nit\'s a lot. link in bio.\n\n#contentcreator #bts #creator #dayinmylife',
    likes: 1_080_000, views: 14_600_000, comments: 9_400, saves: 76_000, shares: 38_000, engagementRate: 15.2,
    postedAt: '2025-10-28T13:00:00Z', niche: 'bts',
  },
  {
    id: 'vp-14', handle: 'aria.rose', platform: 'tiktok', postKind: 'video',
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #FBBF24 100%)',
    hook: 'get ready with me but make it devastating 💄',
    caption: 'get ready with me but make it devastating 💄\n\nproducts & link in bio\n\n#grwm #makeup #beauty #fyp',
    likes: 6_720_000, views: 91_400_000, comments: 53_800, saves: 428_000, shares: 311_000, engagementRate: 9.4,
    postedAt: '2025-10-25T20:00:00Z', niche: 'beauty',
  },
  {
    id: 'vp-15', handle: 'ellie.creates', platform: 'instagram', postKind: 'carousel',
    gradient: 'linear-gradient(135deg, #10B981 0%, #F59E0B 100%)',
    hook: 'outfits that work harder than I do 🤍',
    caption: 'outfits that work harder than I do 🤍\n\nswipe for all 5 looks + links\n\n#ootd #fashion #style #aesthetic',
    likes: 1_320_000, comments: 12_300, saves: 234_000, shares: 71_000, engagementRate: 20.8,
    postedAt: '2025-10-22T16:00:00Z', niche: 'lifestyle',
  },
  {
    id: 'vp-16', handle: 'nova.fit', platform: 'instagram', postKind: 'reel',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
    hook: 'you asked for the leg day routine so here it is 🦵🔥',
    caption: 'you asked for the leg day routine so here it is 🦵🔥\n\nfull programme link in bio — thousands of you are already on it\n\n#legday #gym #fitness #creator',
    likes: 2_760_000, views: 31_200_000, comments: 20_100, saves: 302_000, shares: 118_000, engagementRate: 16.4,
    postedAt: '2025-10-18T12:00:00Z', niche: 'gym',
  },
  {
    id: 'vp-17', handle: 'chloe.x', platform: 'instagram', postKind: 'image',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
    hook: 'manifested this view and I\'m not looking back 🌅',
    caption: 'manifested this view and I\'m not looking back 🌅\n\nlink for the full experience\n\n#bali #travel #model #luxury',
    likes: 3_890_000, comments: 28_700, saves: 156_000, shares: 87_000, engagementRate: 19.3,
    postedAt: '2025-10-15T08:00:00Z', niche: 'travel',
  },
  {
    id: 'vp-18', handle: 'ruby.creator', platform: 'tiktok', postKind: 'video',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
    hook: 'what I actually wear to bed vs what IG thinks I wear 😂',
    caption: 'what I actually wear to bed vs what IG thinks I wear 😂\n\nlink in bio 🔗\n\n#relatable #creator #fyp #viral',
    likes: 7_140_000, views: 104_000_000, comments: 61_200, saves: 389_000, shares: 402_000, engagementRate: 8.6,
    postedAt: '2025-10-12T21:00:00Z', niche: 'bts',
  },
  {
    id: 'vp-19', handle: 'zara.model', platform: 'tiktok', postKind: 'video',
    gradient: 'linear-gradient(135deg, #FBBF24 0%, #EC4899 100%)',
    hook: 'sunset shoot ft. zero retouching 💛',
    caption: 'sunset shoot ft. zero retouching 💛\n\nbehind the scenes vlog coming soon\n\n#photoshoot #bts #model #naturalbeauty',
    likes: 4_440_000, views: 58_600_000, comments: 35_900, saves: 248_000, shares: 178_000, engagementRate: 11.1,
    postedAt: '2025-10-10T18:00:00Z', niche: 'bts',
  },
  {
    id: 'vp-20', handle: 'isla.rose', platform: 'tiktok', postKind: 'video',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
    hook: 'they said this bikini was "too small" but 76M views later 🤷‍♀️',
    caption: 'they said this bikini was "too small" but 76M views later 🤷‍♀️\n\nlink in bio 💙\n\n#bikini #beach #model #fyp',
    likes: 8_920_000, views: 76_400_000, comments: 72_100, saves: 512_000, shares: 498_000, engagementRate: 13.7,
    postedAt: '2025-10-08T14:00:00Z', niche: 'bikini',
  },
];

// Handles that "ship" with mock posts
const DEFAULT_TRACKED: TrackedCreator[] = [
  { id: 'tc-1', handle: 'sophiameyer_', platform: 'instagram', addedAt: new Date().toISOString(), lastScrapedAt: new Date(Date.now() - 3600_000).toISOString(), scrapeStatus: 'done', postCount: 3 },
  { id: 'tc-2', handle: 'luna.voss',     platform: 'tiktok',    addedAt: new Date().toISOString(), lastScrapedAt: new Date(Date.now() - 7200_000).toISOString(), scrapeStatus: 'done', postCount: 2 },
  { id: 'tc-3', handle: 'chloe.x',       platform: 'both',      addedAt: new Date().toISOString(), lastScrapedAt: new Date(Date.now() - 1800_000).toISOString(), scrapeStatus: 'done', postCount: 4 },
  { id: 'tc-4', handle: 'ruby.creator',  platform: 'both',      addedAt: new Date().toISOString(), lastScrapedAt: new Date(Date.now() - 5400_000).toISOString(), scrapeStatus: 'done', postCount: 3 },
];

const NICHE_TAGS: { key: NicheTag; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'beauty',    label: 'Beauty' },
  { key: 'bikini',    label: 'Bikini' },
  { key: 'gym',       label: 'Gym / Fitness' },
  { key: 'lingerie',  label: 'Lingerie' },
  { key: 'travel',    label: 'Travel' },
  { key: 'bts',       label: 'BTS / Creator' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function platformColor(p: 'instagram' | 'tiktok'): string {
  return p === 'instagram' ? '#E1306C' : '#69C9D0';
}

// ─── Post card ────────────────────────────────────────────────────────────────

function ViralPostCard({
  post,
  saved,
  onSave,
}: {
  post: ViralPost;
  saved: boolean;
  onSave: () => void;
}) {
  const KindIcon = post.postKind === 'reel' || post.postKind === 'video'
    ? Film
    : post.postKind === 'carousel'
    ? LayoutGrid
    : ImageIcon;

  return (
    <div className="card group flex flex-col overflow-hidden transition-all hover:border-white/10">
      {/* Thumbnail */}
      <div className="relative aspect-[4/5] flex-shrink-0 overflow-hidden">
        <div className="w-full h-full" style={{ background: post.gradient }} />

        {/* Overlay gradient for readability */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />

        {/* Platform badge */}
        <div
          className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
          style={{ background: platformColor(post.platform) }}
        >
          {post.platform === 'instagram' ? 'IG' : 'TT'}
        </div>

        {/* Post kind badge */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.85)' }}
        >
          <KindIcon className="w-2.5 h-2.5" />
          {post.postKind.charAt(0).toUpperCase() + post.postKind.slice(1)}
        </div>

        {/* Engagement overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2.5">
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-white">
            <Heart className="w-3 h-3 text-rose-400" />
            {fmtNum(post.likes)}
          </span>
          {post.views != null && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-white">
              <Eye className="w-3 h-3 text-sky-300" />
              {fmtNum(post.views)}
            </span>
          )}
          <span className="ml-auto text-[10px] font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded-full">
            {post.engagementRate.toFixed(1)}% ER
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2.5 flex-1">
        {/* Handle + time */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">@{post.handle}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {formatDistanceToNow(new Date(post.postedAt), { addSuffix: true })}
          </span>
        </div>

        {/* Hook */}
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {post.hook}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="w-2.5 h-2.5" />
            {fmtNum(post.comments)}
          </span>
          <span className="flex items-center gap-0.5">
            <Bookmark className="w-2.5 h-2.5" />
            {fmtNum(post.saves)}
          </span>
          <span className="flex items-center gap-0.5 ml-auto">
            <TrendingUp className="w-2.5 h-2.5 text-green-400" />
            <span className="text-green-400">{fmtNum(post.shares)} shares</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-0.5 mt-auto">
          <button
            onClick={onSave}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: saved ? 'rgba(34,197,94,0.12)' : 'rgba(124,58,237,0.12)',
              color: saved ? '#4ade80' : '#A78BFA',
              border: `1px solid ${saved ? 'rgba(34,197,94,0.25)' : 'rgba(124,58,237,0.25)'}`,
            }}
          >
            {saved ? <Check className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
            {saved ? 'Saved' : 'Save to Captions'}
          </button>
          {post.sourceUrl && (
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon flex-shrink-0"
              title="View original"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Creator row ──────────────────────────────────────────────────────────────

function CreatorRow({
  creator,
  onRemove,
  onSync,
}: {
  creator: TrackedCreator;
  onRemove: () => void;
  onSync: () => void;
}) {
  return (
    <div className="card p-3 group flex items-center gap-3 hover:border-white/10 transition-all">
      {/* Avatar placeholder */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
        style={{ background: `hsl(${(creator.handle.charCodeAt(0) * 37) % 360}, 60%, 35%)` }}
      >
        {creator.handle[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white truncate">@{creator.handle}</span>
          {creator.platform === 'instagram' && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: '#E1306C' }}>IG</span>
          )}
          {creator.platform === 'tiktok' && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: '#010101', border: '1px solid #69C9D0' }}>TT</span>
          )}
          {creator.platform === 'both' && (
            <>
              <span className="text-[9px] font-bold px-1 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: '#E1306C' }}>IG</span>
              <span className="text-[9px] font-bold px-1 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: '#010101', border: '1px solid #69C9D0' }}>TT</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {creator.scrapeStatus === 'scraping' ? (
            <span className="text-[10px] text-violet-400 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              Scraping…
            </span>
          ) : creator.lastScrapedAt ? (
            <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Clock className="w-2.5 h-2.5" />
              {formatDistanceToNow(new Date(creator.lastScrapedAt), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Never scraped</span>
          )}
          {creator.postCount > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>· {creator.postCount} posts</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onSync}
          disabled={creator.scrapeStatus === 'scraping'}
          className="btn-icon disabled:opacity-40"
          title="Sync now"
        >
          <RefreshCw className={`w-3 h-3 ${creator.scrapeStatus === 'scraping' ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={onRemove} className="btn-icon hover:text-red-400" title="Remove">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const { models, setModels, setCurrentUser, addPostReference, postReferences } = useStore();

  useEffect(() => {
    setModels(mockModels);
    setCurrentUser(mockAdmin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Creator watchlist
  const [creators, setCreators] = useState<TrackedCreator[]>(DEFAULT_TRACKED);
  const [newHandle, setNewHandle] = useState('');
  const [newPlatform, setNewPlatform] = useState<CreatorPlatform>('both');
  const [scrapeInterval, setScrapeInterval] = useState<'24h' | '48h'>('24h');
  const scrapeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Feed state
  const [activeNiche, setActiveNiche] = useState<NicheTag>('all');
  const [sortKey, setSortKey] = useState<SortKey>('viral');
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());

  // Build the current feed from tracked handles
  const trackedHandles = creators.map((c) => c.handle.toLowerCase());
  const feed = VIRAL_POST_BANK.filter(
    (p) => trackedHandles.length === 0 || trackedHandles.includes(p.handle.toLowerCase())
  );
  const filteredFeed = (activeNiche === 'all' ? feed : feed.filter((p) => p.niche === activeNiche))
    .slice()
    .sort((a, b) => {
      if (sortKey === 'viral')  return b.engagementRate - a.engagementRate;
      if (sortKey === 'saves')  return b.saves - a.saves;
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });

  // Add a creator handle
  const handleAddCreator = useCallback(() => {
    const handle = newHandle.replace(/^@/, '').trim().toLowerCase();
    if (!handle || creators.some((c) => c.handle === handle)) return;
    const newCreator: TrackedCreator = {
      id: `tc-${Date.now()}`,
      handle,
      platform: newPlatform,
      addedAt: new Date().toISOString(),
      scrapeStatus: 'scraping',
      postCount: 0,
    };
    setCreators((prev) => [newCreator, ...prev]);
    setNewHandle('');

    // Simulate scrape completing after 2s
    scrapeTimers.current[newCreator.id] = setTimeout(() => {
      setCreators((prev) =>
        prev.map((c) =>
          c.id === newCreator.id
            ? { ...c, scrapeStatus: 'done', lastScrapedAt: new Date().toISOString(), postCount: Math.floor(Math.random() * 6) + 2 }
            : c
        )
      );
    }, 2000);
  }, [newHandle, newPlatform, creators]);

  // Manual sync
  const handleSync = useCallback((id: string) => {
    setCreators((prev) => prev.map((c) => c.id === id ? { ...c, scrapeStatus: 'scraping' } : c));
    scrapeTimers.current[id] = setTimeout(() => {
      setCreators((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, scrapeStatus: 'done', lastScrapedAt: new Date().toISOString(), postCount: c.postCount + Math.floor(Math.random() * 3) + 1 }
            : c
        )
      );
    }, 2200);
  }, []);

  const handleRemoveCreator = useCallback((id: string) => {
    clearTimeout(scrapeTimers.current[id]);
    setCreators((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Save a viral post as a PostReference
  const handleSavePost = useCallback((post: ViralPost) => {
    if (savedPostIds.has(post.id)) return;
    const ref: PostReference = {
      id: `ref-${post.id}`,
      coverImageUrl: null,
      caption: post.hook,
      description: post.caption,
      sourcePlatform: post.platform,
      sourceUrl: post.sourceUrl,
      createdAt: new Date().toISOString(),
      tags: [post.niche, post.platform, post.postKind],
      category: 'general' as CaptionCategory,
      performanceRating: post.engagementRate > 15 ? 'high' : post.engagementRate > 9 ? 'medium' : 'low',
    };
    addPostReference(ref);
    setSavedPostIds((prev) => new Set([...prev, post.id]));
  }, [savedPostIds, addPostReference]);

  // Mark already-saved posts (by matching hook text)
  const existingHooks = new Set(postReferences.map((r) => r.caption));

  const totalPosts = VIRAL_POST_BANK.filter((p) => trackedHandles.includes(p.handle.toLowerCase())).length;
  const avgER = totalPosts > 0
    ? (feed.reduce((s, p) => s + p.engagementRate, 0) / feed.length).toFixed(1)
    : '—';

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 py-6">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="page-title flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            Niche Intelligence
          </h1>
          <p className="page-subtitle">
            Track top OFM creators · curate viral posts · save the best hooks to your caption library
          </p>
        </div>

        <div className="flex gap-6 items-start">

          {/* ── Left: Creator Watchlist ── */}
          <aside className="w-72 flex-shrink-0 flex flex-col gap-4">

            {/* Add creator */}
            <div className="card p-4 flex flex-col gap-3">
              <p className="section-title">Add Creator</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCreator(); }}
                  placeholder="@handle"
                  className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <button
                  onClick={handleAddCreator}
                  disabled={!newHandle.trim()}
                  className="btn-icon disabled:opacity-40 w-9 h-9 flex-shrink-0"
                  style={{ background: 'var(--accent-violet)' }}
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Platform selector */}
              <div className="toggle-group">
                {(['instagram', 'tiktok', 'both'] as CreatorPlatform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPlatform(p)}
                    className={`toggle-item flex-1 capitalize text-xs ${newPlatform === p ? 'toggle-item-active' : ''}`}
                  >
                    {p === 'both' ? 'Both' : p === 'instagram' ? 'IG' : 'TikTok'}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-scrape interval */}
            <div className="card p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-medium text-zinc-300">Auto-scrape</span>
              </div>
              <div className="toggle-group">
                {(['24h', '48h'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setScrapeInterval(v)}
                    className={`toggle-item text-xs px-3 ${scrapeInterval === v ? 'toggle-item-active' : ''}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="card p-3 text-center">
                <p className="text-xl font-bold text-white">{creators.length}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Creators tracked</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xl font-bold text-white">{avgER}%</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg eng. rate</p>
              </div>
            </div>

            {/* Creator list */}
            <div className="flex flex-col gap-2">
              <p className="section-title">Watchlist ({creators.length})</p>
              {creators.length === 0 ? (
                <div className="card p-6 text-center">
                  <AtSign className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add creator handles to start tracking viral posts</p>
                </div>
              ) : (
                creators.map((c) => (
                  <CreatorRow
                    key={c.id}
                    creator={c}
                    onRemove={() => handleRemoveCreator(c.id)}
                    onSync={() => handleSync(c.id)}
                  />
                ))
              )}
            </div>
          </aside>

          {/* ── Right: Viral Feed ── */}
          <main className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Feed controls */}
            <div className="flex flex-col gap-3">
              {/* Niche filter chips */}
              <div className="flex gap-2 flex-wrap">
                {NICHE_TAGS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveNiche(key)}
                    className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                    style={{
                      background: activeNiche === key ? 'var(--accent-violet)' : 'rgba(255,255,255,0.06)',
                      color: activeNiche === key ? 'white' : 'var(--text-muted)',
                      border: `1px solid ${activeNiche === key ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Sort + results count */}
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span className="text-white font-semibold">{filteredFeed.length}</span> viral posts
                  {activeNiche !== 'all' && ` · ${NICHE_TAGS.find((t) => t.key === activeNiche)?.label}`}
                </p>
                <div className="toggle-group">
                  {([
                    { key: 'viral' as SortKey,  label: 'Most Viral'  },
                    { key: 'saves' as SortKey,  label: 'Most Saved'  },
                    { key: 'recent' as SortKey, label: 'Most Recent' },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSortKey(key)}
                      className={`toggle-item text-xs ${sortKey === key ? 'toggle-item-active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid */}
            {filteredFeed.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredFeed.map((post) => (
                  <ViralPostCard
                    key={post.id}
                    post={post}
                    saved={savedPostIds.has(post.id) || existingHooks.has(post.hook)}
                    onSave={() => handleSavePost(post)}
                  />
                ))}
              </div>
            ) : (
              <div className="card p-16 flex flex-col items-center gap-3 text-center">
                <TrendingUp className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium text-white">No posts yet</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Add creator handles to your watchlist and we'll curate their most viral content
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
