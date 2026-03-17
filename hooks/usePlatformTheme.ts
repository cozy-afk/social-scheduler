import { useMemo } from 'react';
import { Platform, PostType, CropRatio } from '@/types/models';
import {
  getPlatformTheme,
  getPostTypeConfig,
  getPostTypeColor,
  getPlatformsForRatio,
  getPostTypeForPlatformAndRatio,
} from '@/lib/constants/platform';

/**
 * Hook to access platform theme information
 */
export function usePlatformTheme(platform: Platform) {
  return useMemo(() => getPlatformTheme(platform), [platform]);
}

/**
 * Hook to access post type configuration
 */
export function usePostTypeConfig(postType: PostType) {
  return useMemo(() => getPostTypeConfig(postType), [postType]);
}

/**
 * Hook to access post type colors
 */
export function usePostTypeColor(postType: PostType) {
  return useMemo(() => getPostTypeColor(postType), [postType]);
}

/**
 * Hook to get platforms for a specific crop ratio
 */
export function usePlatformsForRatio(ratio: CropRatio) {
  return useMemo(() => getPlatformsForRatio(ratio), [ratio]);
}

/**
 * Hook to get post type for platform and ratio combination
 */
export function usePostTypeForPlatformAndRatio(platform: Platform, ratio: CropRatio) {
  return useMemo(() => getPostTypeForPlatformAndRatio(platform, ratio), [platform, ratio]);
}

/**
 * Hook to get platform color variant
 */
export function usePlatformColor(platform: Platform, variant: 'bg' | 'bgDim' | 'border' | 'ring' | 'text') {
  const theme = usePlatformTheme(platform);
  return theme[variant];
}
