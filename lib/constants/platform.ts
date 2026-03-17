import { Platform, PostType, CropRatio } from '@/types/models';

// ─── Platform Theme Configuration ──────────────────────────────────────────────

export interface PlatformTheme {
  // Color variants
  bg: string;
  bgDim: string;
  border: string;
  ring: string;
  text: string;

  // UI elements
  icon: string;
  label: string;
  shortLabel: string;

  // Active state
  active: string;
}

export const PLATFORM_THEMES: Record<Platform, PlatformTheme> = {
  instagram: {
    bg: 'bg-pink-500',
    bgDim: 'bg-pink-500/15',
    border: 'border-pink-500',
    ring: 'ring-pink-500/60',
    text: 'text-pink-300',
    icon: '📸',
    label: 'Instagram',
    shortLabel: 'IG',
    active: 'border-pink-500/60 bg-pink-500/15 text-pink-300',
  },
  tiktok: {
    bg: 'bg-red-500',
    bgDim: 'bg-red-500/15',
    border: 'border-red-500',
    ring: 'ring-red-500/60',
    text: 'text-red-300',
    icon: '🎵',
    label: 'TikTok',
    shortLabel: 'TT',
    active: 'border-red-500/60 bg-red-500/15 text-red-300',
  },
  x: {
    bg: 'bg-slate-400',
    bgDim: 'bg-slate-500/15',
    border: 'border-slate-400',
    ring: 'ring-slate-400/60',
    text: 'text-slate-200',
    icon: '𝕏',
    label: 'X',
    shortLabel: 'X',
    active: 'border-slate-400/60 bg-slate-500/15 text-slate-200',
  },
  threads: {
    bg: 'bg-purple-500',
    bgDim: 'bg-purple-500/15',
    border: 'border-purple-500',
    ring: 'ring-purple-500/60',
    text: 'text-purple-300',
    icon: '🧵',
    label: 'Threads',
    shortLabel: 'Threads',
    active: 'border-purple-500/60 bg-purple-500/15 text-purple-300',
  },
  fanvue: {
    bg: 'bg-orange-500',
    bgDim: 'bg-orange-500/15',
    border: 'border-orange-500',
    ring: 'ring-orange-500/60',
    text: 'text-orange-300',
    icon: '🎭',
    label: 'Fanvue',
    shortLabel: 'Fanvue',
    active: 'border-orange-500/60 bg-orange-500/15 text-orange-300',
  },
};

// ─── Post Type Configuration ─────────────────────────────────────────────────────

export interface PostTypeConfig {
  label: string;
  icon: string;
  platform: Platform;
  aspectRatio: '1:1' | '4:5' | '9:16' | 'variable';
}

export const POST_TYPE_CONFIGS: Record<PostType, PostTypeConfig> = {
  instagram_post: {
    label: 'IG Post',
    icon: '🖼️',
    platform: 'instagram',
    aspectRatio: '1:1',
  },
  instagram_reel: {
    label: 'IG Reel',
    icon: '🎬',
    platform: 'instagram',
    aspectRatio: '9:16',
  },
  instagram_story: {
    label: 'IG Story',
    icon: '⭕',
    platform: 'instagram',
    aspectRatio: '9:16',
  },
  tiktok_reel: {
    label: 'TT Reel',
    icon: '🎬',
    platform: 'tiktok',
    aspectRatio: '9:16',
  },
  tiktok_slideshow: {
    label: 'TT Slide',
    icon: '🖼️',
    platform: 'tiktok',
    aspectRatio: '1:1',
  },
  tiktok_story: {
    label: 'TT Story',
    icon: '⭕',
    platform: 'tiktok',
    aspectRatio: '9:16',
  },
  x_post: {
    label: 'X',
    icon: '💬',
    platform: 'x',
    aspectRatio: 'variable',
  },
  threads_post: {
    label: 'Threads',
    icon: '💬',
    platform: 'threads',
    aspectRatio: '1:1',
  },
  fanvue_post: {
    label: 'Fanvue',
    icon: '🎭',
    platform: 'fanvue',
    aspectRatio: '1:1',
  },
};

// ─── Post Type Color Configuration ───────────────────────────────────────────────

export const POST_TYPE_COLORS: Record<PostType, string> = {
  instagram_post: 'bg-pink-500/30 border-pink-500/50',
  instagram_reel: 'bg-rose-500/30 border-rose-500/50',
  instagram_story: 'bg-orange-500/30 border-orange-500/50',
  tiktok_reel: 'bg-red-500/30 border-red-500/50',
  tiktok_slideshow: 'bg-red-400/30 border-red-400/50',
  tiktok_story: 'bg-orange-400/30 border-orange-400/50',
  x_post: 'bg-slate-500/30 border-slate-500/50',
  threads_post: 'bg-purple-500/30 border-purple-500/50',
  fanvue_post: 'bg-orange-500/30 border-orange-500/50',
};

// ─── Crop Ratio to Platforms Mapping ──────────────────────────────────────────────

export const RATIO_TO_PLATFORMS: Record<CropRatio, Platform[]> = {
  '1:1': ['instagram', 'threads', 'fanvue'],
  '4:5': ['instagram', 'fanvue'],
  '9:16': ['instagram', 'tiktok'],
};

// ─── Platform and Ratio to Post Type Mapping ────────────────────────────────────

export const PLATFORM_RATIO_TO_POST_TYPE: Record<
  Platform,
  Record<CropRatio, PostType>
> = {
  instagram: {
    '1:1': 'instagram_post',
    '4:5': 'instagram_post',
    '9:16': 'instagram_reel',
  },
  tiktok: {
    '1:1': 'tiktok_slideshow',
    '4:5': 'tiktok_slideshow',
    '9:16': 'tiktok_reel',
  },
  x: {
    '1:1': 'x_post',
    '4:5': 'x_post',
    '9:16': 'x_post',
  },
  threads: {
    '1:1': 'threads_post',
    '4:5': 'threads_post',
    '9:16': 'threads_post',
  },
  fanvue: {
    '1:1': 'fanvue_post',
    '4:5': 'fanvue_post',
    '9:16': 'fanvue_post',
  },
};

// ─── Helper Functions ───────────────────────────────────────────────────────────

export function getPlatformTheme(platform: Platform): PlatformTheme {
  return PLATFORM_THEMES[platform];
}

export function getPostTypeConfig(postType: PostType): PostTypeConfig {
  return POST_TYPE_CONFIGS[postType];
}

export function getPostTypeColor(postType: PostType): string {
  return POST_TYPE_COLORS[postType];
}

export function getPlatformsForRatio(ratio: CropRatio): Platform[] {
  return RATIO_TO_PLATFORMS[ratio];
}

export function getPostTypeForPlatformAndRatio(
  platform: Platform,
  ratio: CropRatio
): PostType {
  return PLATFORM_RATIO_TO_POST_TYPE[platform][ratio];
}

export function getPlatformColor(platform: Platform, variant: keyof PlatformTheme): string {
  return PLATFORM_THEMES[platform][variant];
}
