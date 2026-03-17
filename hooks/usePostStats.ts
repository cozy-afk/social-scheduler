import { useMemo } from 'react';
import { Post, Model } from '@/types/models';
import { calculatePostStats, calculateTodayStats } from '@/lib/utils/posts';

/**
 * Hook to calculate post statistics
 */
export function usePostStats(posts: Post[], model?: Model) {
  return useMemo(() => calculatePostStats(posts, model), [posts, model]);
}

/**
 * Hook to calculate today's post statistics for a model
 */
export function useTodayStats(posts: Post[], model: Model) {
  return useMemo(() => calculateTodayStats(posts, model), [posts, model]);
}

/**
 * Hook to filter posts by model
 */
export function usePostsByModel(posts: Post[], modelId: string) {
  return useMemo(() => posts.filter((p) => p.modelId === modelId), [posts, modelId]);
}

/**
 * Hook to filter posts by platform
 */
export function usePostsByPlatform(posts: Post[], platform: string) {
  return useMemo(() => posts.filter((p) => p.platform === platform), [posts, platform]);
}
