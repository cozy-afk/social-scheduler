'use client';

import { useStore } from '@/lib/store';
import { useState, useMemo, useCallback } from 'react';
import {
  format, eachDayOfInterval, isToday, isSameMonth,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Eye, Film, Image as ImageIcon, Layers } from 'lucide-react';
import { Post, Model, Platform, PostType } from '@/types/models';
import clsx from 'clsx';
import FeedPreviewModal from './FeedPreviewModal';
import { PLATFORM_THEMES, POST_TYPE_CONFIGS } from '@/lib/constants/platform';
import { isRealUrl, calculateTodayStats, getDayPosts } from '@/lib/utils/posts';
import { navigateDate, formatViewTitle, getWeekDays, WEEKDAYS } from '@/lib/utils/date';

type CalendarViewType = 'day' | 'week' | 'month';

// ─── Platform dot colours (inline, avoids purge issues) ───────────────────────

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: '#ec4899',
  tiktok:    '#ef4444',
  x:         '#94a3b8',
  threads:   '#a855f7',
  fanvue:    '#f97316',
};

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'IG',
  tiktok:    'TT',
  x:         'X',
  threads:   'Th',
  fanvue:    'FV',
};

// ─── Content type helpers ─────────────────────────────────────────────────────

function isReelType(postType: PostType): boolean {
  return postType === 'instagram_reel' || postType === 'tiktok_reel';
}
function isStoryType(postType: PostType): boolean {
  return postType === 'instagram_story' || postType === 'tiktok_story';
}
function isCarouselType(postType: PostType): boolean {
  return postType === 'tiktok_slideshow';
}

type ContentKind = 'reel' | 'story' | 'carousel' | 'post';

function contentKind(postType: PostType): ContentKind {
  if (isReelType(postType))    return 'reel';
  if (isStoryType(postType))   return 'story';
  if (isCarouselType(postType)) return 'carousel';
  return 'post';
}

const KIND_BADGE: Record<ContentKind, { label: string; color: string; icon: React.ReactNode }> = {
  reel:     { label: 'Reel',     color: '#7C3AED', icon: <Film   className="w-2.5 h-2.5" /> },
  story:    { label: 'Story',    color: '#EC4899', icon: <span className="text-[8px] font-bold">○</span> },
  carousel: { label: 'Carousel', color: '#F59E0B', icon: <Layers className="w-2.5 h-2.5" /> },
  post:     { label: 'Post',     color: '#22C55E', icon: <ImageIcon className="w-2.5 h-2.5" /> },
};

// ─── Grouped post ─────────────────────────────────────────────────────────────
// When the same asset is cross-posted to multiple platforms at the same time,
// we display it as ONE card with multiple platform badges.

interface GroupedPost {
  key:           string;
  posts:         Post[];
  scheduledTime: string;
  assetUrl:      string;
  primaryType:   PostType;
  kind:          ContentKind;
  platforms:     Platform[];
}

function groupPostsByAsset(posts: Post[]): GroupedPost[] {
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    const assetUrl = post.assets[0]?.fileUrl ?? '';
    // Group key: same asset URL + same 15-minute bucket so nearby cross-posts merge
    const timeBucket = post.scheduledTime.slice(0, 15); // "YYYY-MM-DDTHH:MM"
    const key = `${assetUrl}|${timeBucket}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(post);
  }

  const groups: GroupedPost[] = [];
  for (const [key, groupPosts] of map) {
    const primary = groupPosts[0];
    const assetUrl = primary.assets[0]?.fileUrl ?? '';
    groups.push({
      key,
      posts:         groupPosts,
      scheduledTime: primary.scheduledTime,
      assetUrl,
      primaryType:   primary.postType,
      kind:          contentKind(primary.postType),
      platforms:     [...new Set(groupPosts.map((p) => p.platform))],
    });
  }
  return groups.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

// ─── Visual post card ─────────────────────────────────────────────────────────

interface PostCardProps {
  group:     GroupedPost;
  onClick:   () => void;
  size?:     'sm' | 'md' | 'lg';
}

function PostCard({ group, onClick, size = 'md' }: PostCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const showImg = isRealUrl(group.assetUrl) && !imgErr;
  const badge   = KIND_BADGE[group.kind];
  const time    = format(new Date(group.scheduledTime), 'HH:mm');

  if (size === 'sm') {
    // Month view — compact thumbnail
    return (
      <button
        onClick={onClick}
        title={`${badge.label} · ${time} · ${group.platforms.map((p) => PLATFORM_LABELS[p]).join(', ')}`}
        className="relative group rounded-lg overflow-hidden flex-shrink-0 transition-transform hover:scale-105"
        style={{ width: 32, height: 32 }}
      >
        {showImg ? (
          <img src={group.assetUrl} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: badge.color + '22' }}>
            <span className="text-[10px]">{badge.icon}</span>
          </div>
        )}
        {/* kind colour strip at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: badge.color }} />
        {/* platform dots top-right */}
        <div className="absolute top-0.5 right-0.5 flex gap-px">
          {group.platforms.slice(0, 3).map((p) => (
            <div key={p} className="w-1.5 h-1.5 rounded-full border border-black/60" style={{ background: PLATFORM_COLORS[p] }} />
          ))}
        </div>
      </button>
    );
  }

  // Week / day view
  const thumbH = size === 'lg' ? 160 : 88;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl overflow-hidden transition-all hover:ring-1 hover:ring-white/20 group"
      style={{ background: 'var(--bg-elevated)', border: `1px solid rgba(255,255,255,0.06)` }}
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden" style={{ height: thumbH }}>
        {showImg ? (
          <img src={group.assetUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ background: badge.color + '18' }}>
            <span className="text-xl">{badge.icon}</span>
            <span className="text-[9px] font-medium" style={{ color: badge.color }}>{badge.label}</span>
          </div>
        )}

        {/* Kind badge — top left */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
          style={{ background: badge.color + 'DD', color: '#fff' }}>
          {badge.icon}
          {badge.label}
        </div>

        {/* Time — top right */}
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold"
          style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
          {time}
        </div>

        {/* Video play overlay */}
        {(group.kind === 'reel' || group.kind === 'story') && showImg && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <Film className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Platform badges */}
      <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
        {group.platforms.map((p) => (
          <span
            key={p}
            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: PLATFORM_COLORS[p] + '28', color: PLATFORM_COLORS[p] }}
          >
            {PLATFORM_LABELS[p]}
          </span>
        ))}
        {group.posts.length > group.platforms.length && (
          <span className="text-[9px] text-zinc-500">×{group.posts.length}</span>
        )}
      </div>
    </button>
  );
}

// ─── Empty slot (subtle, not alarming) ───────────────────────────────────────

function EmptySlot({ time, onClick }: { time: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl flex items-center justify-center gap-1.5 transition-all hover:bg-white/4 group"
      style={{ height: 48, border: '1px dashed rgba(255,255,255,0.08)' }}
    >
      <Plus className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
      <span className="text-[10px] font-mono text-zinc-700 group-hover:text-zinc-500 transition-colors">{time}</span>
    </button>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ date, model, posts, onCreatePost, onEditPost }: {
  date: Date; model: Model; posts: Post[];
  onCreatePost: () => void; onEditPost: (p: Post) => void;
}) {
  const grouped = useMemo(() => {
    const dayPosts = posts.filter((p) => {
      const d = new Date(p.scheduledTime);
      return d.getFullYear() === date.getFullYear() &&
             d.getMonth()    === date.getMonth()    &&
             d.getDate()     === date.getDate()     &&
             p.modelId       === model.id;
    });
    return groupPostsByAsset(dayPosts);
  }, [posts, date, model.id]);

  // Unique scheduled times from this model's posting schedule for this day
  const scheduledTimes = useMemo(() => {
    const dow = date.getDay();
    const isWeekday = dow >= 1 && dow <= 5;
    const isWeekend = dow === 0 || dow === 6;
    return [...new Set(
      model.postingSchedule
        .filter((s) =>
          s.recurrence === 'daily' ||
          (s.recurrence === 'weekdays' && isWeekday) ||
          (s.recurrence === 'weekends' && isWeekend)
        )
        .map((s) => s.time)
    )].sort();
  }, [model, date]);

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {grouped.length} / {scheduledTimes.length} slots filled
        </span>
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{
            width: scheduledTimes.length ? `${(grouped.length / scheduledTimes.length) * 100}%` : '0%',
            background: 'linear-gradient(to right, #7C3AED, #A855F7)',
          }} />
        </div>
      </div>

      {scheduledTimes.length === 0 && (
        <div className="card py-16 text-center" style={{ color: 'var(--text-muted)' }}>
          No posting schedule configured for this model
        </div>
      )}

      {scheduledTimes.map((time) => {
        const atTime = grouped.filter((g) => format(new Date(g.scheduledTime), 'HH:mm') === time);
        return (
          <div key={time}>
            <p className="text-xs font-mono font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>{time}</p>
            {atTime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {atTime.map((g) => (
                  <PostCard key={g.key} group={g} size="lg" onClick={() => onEditPost(g.posts[0])} />
                ))}
              </div>
            ) : (
              <EmptySlot time={time} onClick={onCreatePost} />
            )}
          </div>
        );
      })}

      {/* Posts that don't match a schedule slot (manually added) */}
      {grouped.filter((g) => !scheduledTimes.includes(format(new Date(g.scheduledTime), 'HH:mm'))).map((g) => (
        <div key={g.key}>
          <p className="text-xs font-mono font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            {format(new Date(g.scheduledTime), 'HH:mm')}
            <span className="badge badge-violet text-[9px]">custom</span>
          </p>
          <PostCard group={g} size="lg" onClick={() => onEditPost(g.posts[0])} />
        </div>
      ))}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ weekStart, model, posts, onCreatePost, onEditPost, onDayClick }: {
  weekStart: Date; model: Model; posts: Post[];
  onCreatePost: () => void; onEditPost: (p: Post) => void; onDayClick: (d: Date) => void;
}) {
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);

  return (
    <div className="card overflow-hidden">
      {/* Day header row */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {days.map((day) => {
          const todayDay = isToday(day);
          const dayPosts = posts.filter((p) => {
            const d = new Date(p.scheduledTime);
            return d.getFullYear() === day.getFullYear() &&
                   d.getMonth()    === day.getMonth()    &&
                   d.getDate()     === day.getDate()     &&
                   p.modelId       === model.id;
          });
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className="flex flex-col items-center py-3 px-1 transition-colors hover:bg-white/3"
              style={{ borderBottom: todayDay ? '2px solid #7C3AED' : '2px solid transparent' }}
            >
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                {format(day, 'EEE')}
              </span>
              <span className={clsx(
                'text-lg font-bold mt-0.5 w-8 h-8 flex items-center justify-center rounded-full',
                todayDay ? 'text-white' : 'text-zinc-300'
              )}
                style={todayDay ? { background: 'linear-gradient(135deg, #7C3AED, #A855F7)' } : undefined}
              >
                {format(day, 'd')}
              </span>
              {dayPosts.length > 0 && (
                <span className="text-[9px] mt-0.5 font-medium" style={{ color: '#A855F7' }}>
                  {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Post grid */}
      <div className="grid grid-cols-7 divide-x divide-white/5 min-h-[280px]">
        {days.map((day) => {
          const dayPosts = posts.filter((p) => {
            const d = new Date(p.scheduledTime);
            return d.getFullYear() === day.getFullYear() &&
                   d.getMonth()    === day.getMonth()    &&
                   d.getDate()     === day.getDate()     &&
                   p.modelId       === model.id;
          });
          const grouped = groupPostsByAsset(dayPosts);
          const todayDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className="p-1.5 flex flex-col gap-1.5 min-w-0"
              style={{ background: todayDay ? 'rgba(124,58,237,0.04)' : undefined }}
            >
              {grouped.length === 0 ? (
                <button
                  onClick={onCreatePost}
                  className="flex-1 flex items-center justify-center rounded-lg transition-all hover:bg-white/3 group"
                  style={{ minHeight: 60 }}
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-800 group-hover:text-zinc-600 transition-colors" />
                </button>
              ) : (
                grouped.map((g) => (
                  <PostCard key={g.key} group={g} size="md" onClick={() => onEditPost(g.posts[0])} />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ month, model, posts, onDayClick }: {
  month: Date; model: Model; posts: Post[]; onDayClick: (d: Date) => void;
}) {
  const monthStart = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);
  const monthEnd   = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0), [month]);
  const calStart   = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const calEnd     = useMemo(() => endOfWeek(monthEnd,   { weekStartsOn: 1 }), [monthEnd]);
  const allDays    = useMemo(() => eachDayOfInterval({ start: calStart, end: calEnd }), [calStart, calEnd]);

  return (
    <div className="card overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 divide-x divide-y" style={{ ['--tw-divide-opacity' as string]: 1 }}>
        {allDays.map((day) => {
          const inMonth  = isSameMonth(day, month);
          const todayDay = isToday(day);
          const dayPosts = inMonth
            ? posts.filter((p) => {
                const d = new Date(p.scheduledTime);
                return d.getFullYear() === day.getFullYear() &&
                       d.getMonth()    === day.getMonth()    &&
                       d.getDate()     === day.getDate()     &&
                       p.modelId       === model.id;
              })
            : [];
          const grouped  = groupPostsByAsset(dayPosts);
          const visible  = grouped.slice(0, 6);
          const overflow = grouped.length - visible.length;

          return (
            <button
              key={day.toISOString()}
              onClick={() => inMonth && onDayClick(day)}
              disabled={!inMonth}
              className={clsx(
                'min-h-[100px] p-2 text-left flex flex-col gap-1.5 transition-colors',
                !inMonth && 'opacity-20 pointer-events-none',
                inMonth && 'hover:bg-white/2',
                todayDay && 'ring-1 ring-inset ring-violet-500/30',
              )}
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}
            >
              {/* Date number */}
              <span className={clsx(
                'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0',
                todayDay ? 'text-white' : 'text-zinc-400'
              )}
                style={todayDay ? { background: '#7C3AED' } : undefined}
              >
                {format(day, 'd')}
              </span>

              {/* Thumbnail row */}
              {visible.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {visible.map((g) => (
                    <PostCard key={g.key} group={g} size="sm" onClick={() => onDayClick(day)} />
                  ))}
                  {overflow > 0 && (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                      +{overflow}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Content type legend ──────────────────────────────────────────────────────

function ContentLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {(Object.entries(KIND_BADGE) as [ContentKind, typeof KIND_BADGE[ContentKind]][]).map(([kind, cfg]) => (
        <div key={kind} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cfg.color }} />
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{cfg.label}</span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-2 flex-wrap">
        {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([p, label]) => (
          <div key={p} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[p] }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

const ALL_PLATFORMS: Platform[] = ['instagram', 'tiktok', 'x', 'threads', 'fanvue'];

export default function CalendarView() {
  const { models, selectedModelId, posts, setShowCreatePostModal, setEditingPost } = useStore();
  const [view, setView]           = useState<CalendarViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFeedPreview, setShowFeedPreview] = useState(false);
  const [activePlatforms, setActivePlatforms] = useState<Set<Platform>>(new Set(ALL_PLATFORMS));

  const selectedModel = useMemo(() => models.find((m) => m.id === selectedModelId), [models, selectedModelId]);

  const togglePlatform = useCallback((platform: Platform) => {
    setActivePlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        if (next.size === 1) return prev;
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  }, []);

  const goNext = useCallback(() => setCurrentDate((d) => navigateDate(d, 'next', view)), [view]);
  const goPrev = useCallback(() => setCurrentDate((d) => navigateDate(d, 'prev', view)), [view]);

  const handleCreatePost = useCallback(() => {
    setEditingPost(null);
    setShowCreatePostModal(true);
  }, [setEditingPost, setShowCreatePostModal]);

  const handleEditPost = useCallback((post: Post) => {
    setEditingPost(post);
    setShowCreatePostModal(true);
  }, [setEditingPost, setShowCreatePostModal]);

  const handleDayClick = useCallback((day: Date) => {
    setCurrentDate(day);
    setView('day');
  }, []);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const titleLabel = useMemo(() => formatViewTitle(currentDate, view), [currentDate, view]);

  const filteredPosts = useMemo(
    () => posts.filter((p) => activePlatforms.has(p.platform)),
    [posts, activePlatforms]
  );

  const todayStats = useMemo(() => (
    selectedModel ? calculateTodayStats(filteredPosts, selectedModel) : { total: 0, scheduled: 0, missing: 0 }
  ), [filteredPosts, selectedModel]);

  if (!selectedModel) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
        Select a model from the sidebar to view the calendar
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">
            Today: <span style={{ color: '#A855F7' }}>{todayStats.scheduled}</span> scheduled
            {todayStats.missing > 0 && (
              <span className="ml-2" style={{ color: 'var(--text-muted)' }}>· {todayStats.missing} empty slots</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFeedPreview(true)} className="btn-secondary text-sm">
            <Eye className="w-4 h-4" />
            Preview Feed
          </button>
          <button onClick={handleCreatePost} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle */}
        <div className="toggle-group">
          {(['day', 'week', 'month'] as CalendarViewType[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={view === v ? 'toggle-item-active' : 'toggle-item capitalize'}>
              {v}
            </button>
          ))}
        </div>

        {/* Nav */}
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="btn-icon"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-xs px-3 py-1.5">Today</button>
          <button onClick={goNext} className="btn-icon"><ChevronRight className="w-4 h-4" /></button>
          <span className="text-sm font-semibold ml-1" style={{ color: 'var(--text-primary)' }}>{titleLabel}</span>
        </div>

        {/* Platform filter */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {ALL_PLATFORMS.map((platform) => {
            const active = activePlatforms.has(platform);
            return (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={{
                  border: `1px solid ${active ? PLATFORM_COLORS[platform] + '60' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? PLATFORM_COLORS[platform] + '18' : 'transparent',
                  color: active ? PLATFORM_COLORS[platform] : 'var(--text-muted)',
                  opacity: active ? 1 : 0.5,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLATFORM_COLORS[platform] }} />
                {PLATFORM_LABELS[platform]}
              </button>
            );
          })}
          {activePlatforms.size < ALL_PLATFORMS.length && (
            <button onClick={() => setActivePlatforms(new Set(ALL_PLATFORMS))} className="text-[11px] underline" style={{ color: 'var(--text-muted)' }}>
              All
            </button>
          )}
        </div>
      </div>

      {/* ── Calendar views ── */}
      {view === 'day'   && <DayView   date={currentDate} model={selectedModel} posts={filteredPosts} onCreatePost={handleCreatePost} onEditPost={handleEditPost} />}
      {view === 'week'  && <WeekView  weekStart={weekStart} model={selectedModel} posts={filteredPosts} onCreatePost={handleCreatePost} onEditPost={handleEditPost} onDayClick={handleDayClick} />}
      {view === 'month' && <MonthView month={currentDate} model={selectedModel} posts={filteredPosts} onDayClick={handleDayClick} />}

      {/* ── Legend ── */}
      <ContentLegend />

      {showFeedPreview && (
        <FeedPreviewModal
          modelId={selectedModel.id}
          modelName={selectedModel.name}
          scheduledPosts={posts.filter((p) => p.modelId === selectedModel.id)}
          onClose={() => setShowFeedPreview(false)}
        />
      )}
    </div>
  );
}
