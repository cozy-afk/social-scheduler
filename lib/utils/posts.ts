import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { Post, Platform, PostStatus, TimeSlot, Model } from '@/types/models';

// ─── Post Status & Slot Management ─────────────────────────────────────────────

export interface SlotStatus {
  status: PostStatus;
  post?: Post;
}

export function getSlotStatus(
  date: Date,
  slot: TimeSlot,
  posts: Post[],
  modelId: string
): SlotStatus {
  const dateStr = format(date, 'yyyy-MM-dd');
  const post = posts.find(
    (p) =>
      p.modelId === modelId &&
      p.platform === slot.platform &&
      p.postType === slot.postType &&
      p.scheduledTime.startsWith(dateStr) &&
      p.scheduledTime.includes(slot.time)
  );
  return { status: post?.status || 'missing', post };
}

// ─── Post Filtering ────────────────────────────────────────────────────────────

export function filterPostsByModel(posts: Post[], modelId: string): Post[] {
  return posts.filter((p) => p.modelId === modelId);
}

export function filterPostsByDate(posts: Post[], date: Date): Post[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  return posts.filter((p) => p.scheduledTime.startsWith(dateStr));
}

export function filterPostsByModelAndDate(posts: Post[], modelId: string, date: Date): Post[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  return posts.filter((p) => p.modelId === modelId && p.scheduledTime.startsWith(dateStr));
}

export function filterPostsByPlatform(posts: Post[], platform: Platform): Post[] {
  return posts.filter((p) => p.platform === platform);
}

export function filterPostsByPostType(posts: Post[], postType: string): Post[] {
  return posts.filter((p) => p.postType === postType);
}

// ─── Post Statistics ───────────────────────────────────────────────────────────

export interface PostStats {
  total: number;
  scheduled: number;
  completed: number;
  missing: number;
  byPlatform: Record<Platform, number>;
  byPostType: Record<string, number>;
}

export function calculatePostStats(posts: Post[], model?: Model): PostStats {
  const filteredPosts = model ? filterPostsByModel(posts, model.id) : posts;

  // Single-pass calculation for efficiency
  const stats: PostStats = {
    total: filteredPosts.length,
    scheduled: 0,
    completed: 0,
    missing: 0,
    byPlatform: {} as Record<Platform, number>,
    byPostType: {} as Record<string, number>,
  };

  for (const post of filteredPosts) {
    if (post.status === 'scheduled') stats.scheduled++;
    else if (post.status === 'completed') stats.completed++;
    else if (post.status === 'missing') stats.missing++;

    stats.byPlatform[post.platform] = (stats.byPlatform[post.platform] || 0) + 1;
    stats.byPostType[post.postType] = (stats.byPostType[post.postType] || 0) + 1;
  }

  return stats;
}

export function calculateTodayStats(posts: Post[], model: Model): {
  total: number;
  scheduled: number;
  missing: number;
} {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const slots = model.postingSchedule;
  const scheduled = slots.filter((slot) =>
    posts.some(
      (p) =>
        p.modelId === model.id &&
        p.platform === slot.platform &&
        p.postType === slot.postType &&
        p.scheduledTime.startsWith(todayStr) &&
        p.scheduledTime.includes(slot.time) &&
        (p.status === 'scheduled' || p.status === 'completed')
    )
  ).length;
  return { total: slots.length, scheduled, missing: slots.length - scheduled };
}

// ─── Calendar Utilities ───────────────────────────────────────────────────────

export interface CalendarDayInfo {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  posts: Post[];
  missingSlots: number;
}

export function getCalendarDays(month: Date): CalendarDayInfo[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  return allDays.map((day) => ({
    date: day,
    inMonth: day.getMonth() === month.getMonth(),
    isToday: isToday(day),
    posts: [],
    missingSlots: 0,
  }));
}

export function getDayPosts(posts: Post[], modelId: string, day: Date): Post[] {
  const dateStr = format(day, 'yyyy-MM-dd');
  return posts.filter((p) => p.modelId === modelId && p.scheduledTime.startsWith(dateStr));
}

export function getDayMissingCount(posts: Post[], model: Model, day: Date): number {
  const daySlots = model.postingSchedule.map((slot) =>
    getSlotStatus(day, slot, posts, model.id)
  );
  return daySlots.filter((s) => s.status === 'missing').length;
}

// ─── URL Validation ───────────────────────────────────────────────────────────

export function isRealUrl(url?: string): boolean {
  return !!(url && (url.startsWith('blob:') || url.startsWith('http')));
}

// ─── Post Formatting ───────────────────────────────────────────────────────────

export function formatPostTime(scheduledTime: string): string {
  return format(new Date(scheduledTime), 'HH:mm');
}

export function formatPostDate(scheduledTime: string): string {
  return format(new Date(scheduledTime), 'yyyy-MM-dd');
}

export function formatPostDateTime(scheduledTime: string): string {
  return format(new Date(scheduledTime), 'MMM d, yyyy HH:mm');
}

// ─── Post Asset Utilities ────────────────────────────────────────────────────

export function getPostAssets(post: Post): Post['assets'] {
  return post.assets || [];
}

export function getPostPrimaryAsset(post: Post): Post['assets'][0] | undefined {
  return post.assets?.[0];
}

export function hasPostAssets(post: Post): boolean {
  return post.assets && post.assets.length > 0;
}

// ─── Post Status Helpers ───────────────────────────────────────────────────────

export function isPostScheduled(post: Post): boolean {
  return post.status === 'scheduled';
}

export function isPostCompleted(post: Post): boolean {
  return post.status === 'completed';
}

export function isPostMissing(post: Post): boolean {
  return post.status === 'missing';
}

export function isPostDraft(post: Post): boolean {
  return post.status === 'draft';
}
