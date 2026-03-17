import { Platform, PostType, CropRatio } from '@/types/models';
import { InstagramIcon, TikTokIcon, XIcon, ThreadsIcon, FanvueIcon } from '@/components/PlatformIcons';

// ─── Platform Theme Configuration ──────────────────────────────────────────────

export interface PlatformTheme {
  // Color variants
  bg: string;
  bgDim: string;
  border: string;
  ring: string;
  text: string;

  // UI elements
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  shortLabel: string;

  // Active state
  active: string;
}

export const PLATFORM_THEMES: Record<Platform, PlatformTheme> = {
  instagram: {
    bg: 'bg-gradient-to-br from-orange-500 to-purple-600',
    bgDim: 'bg-gradient-to-br from-orange-500/15 to-purple-600/15',
    border: 'border-[#E1306C]',
    ring: 'ring-[#E1306C]/60',
    text: 'text-[#E1306C]',
    icon: InstagramIcon,
    label: 'Instagram',
    shortLabel: 'IG',
    active: 'border-[#E1306C]/60 bg-[#E1306C]/15 text-[#E1306C]',
  },
  tiktok: {
    bg: 'bg-gradient-to-br from-[#FF0050] to-[#00F2EA]',
    bgDim: 'bg-gradient-to-br from-[#FF0050]/15 to-[#00F2EA]/15',
    border: 'border-[#FF0050]',
    ring: 'ring-[#FF0050]/60',
    text: 'text-[#FF0050]',
    icon: TikTokIcon,
    label: 'TikTok',
    shortLabel: 'TT',
    active: 'border-[#FF0050]/60 bg-[#FF0050]/15 text-[#FF0050]',
  },
  x: {
    bg: 'bg-black',
    bgDim: 'bg-black/15',
    border: 'border-white/30',
    ring: 'ring-white/60',
    text: 'text-white',
    icon: XIcon,
    label: 'X',
    shortLabel: 'X',
    active: 'border-white/60 bg-white/15 text-white',
  },
  threads: {
    bg: 'bg-black',
    bgDim: 'bg-black/15',
    border: 'border-white/30',
    ring: 'ring-white/60',
    text: 'text-white',
    icon: ThreadsIcon,
    label: 'Threads',
    shortLabel: 'Threads',
    active: 'border-white/60 bg-white/15 text-white',
  },
  fanvue: {
    bg: 'bg-gradient-to-br from-[#FF2E55] to-[#FF4D6A]',
    bgDim: 'bg-gradient-to-br from-[#FF2E55]/15 to-[#FF4D6A]/15',
    border: 'border-[#FF2E55]',
    ring: 'ring-[#FF2E55]/60',
    text: 'text-[#FF2E55]',
    icon: FanvueIcon,
    label: 'Fanvue',
    shortLabel: 'Fanvue',
    active: 'border-[#FF2E55]/60 bg-[#FF2E55]/15 text-[#FF2E55]',
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
  instagram_post: 'bg-[#E1306C]/30 border-[#E1306C]/50',
  instagram_reel: 'bg-gradient-to-br from-[#F58529]/30 to-[#405DE6]/30 border-[#E1306C]/50',
  instagram_story: 'bg-[#F58529]/30 border-[#F58529]/50',
  tiktok_reel: 'bg-gradient-to-br from-[#FF0050]/30 to-[#00F2EA]/30 border-[#FF0050]/50',
  tiktok_slideshow: 'bg-[#00F2EA]/30 border-[#00F2EA]/50',
  tiktok_story: 'bg-[#FF0050]/30 border-[#FF0050]/50',
  x_post: 'bg-white/10 border-white/30',
  threads_post: 'bg-white/10 border-white/30',
  fanvue_post: 'bg-[#FF2E55]/30 border-[#FF2E55]/50',
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

export function getPlatformColor(platform: Platform, variant: Exclude<keyof PlatformTheme, 'icon'>): string {
  return PLATFORM_THEMES[platform][variant];
}

// Helper to get the platform icon component
export function getPlatformIcon(platform: Platform): React.ComponentType<{ size?: number; className?: string }> {
  return PLATFORM_THEMES[platform].icon;
}
