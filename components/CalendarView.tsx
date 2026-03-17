'use client';

import { useStore } from '@/lib/store';
import { useState, useMemo, useCallback } from 'react';
import { format, eachDayOfInterval, isToday, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameMonth, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { Post, Model, TimeSlot, Platform } from '@/types/models';
import FeedPreviewModal from './FeedPreviewModal';
import { PLATFORM_THEMES, POST_TYPE_CONFIGS, getPostTypeColor } from '@/lib/constants/platform';
import { getSlotStatus, isRealUrl, calculateTodayStats, getDayPosts, getDayMissingCount } from '@/lib/utils/posts';
import { navigateDate, formatViewTitle, getWeekDays, WEEKDAYS } from '@/lib/utils/date';

type CalendarViewType = 'day' | 'week' | 'month';

// ─── Post Thumbnail (week/day view card) ──────────────────────────────────────

interface PostCardProps {
  post: Post;
  onClick?: () => void;
  compact?: boolean;
}

function PostCard({ post, onClick, compact = false }: PostCardProps) {
  const [imgError, setImgError] = useState(false);
  const asset = post.assets[0];
  const showImg = isRealUrl(asset?.fileUrl) && !imgError;
  const theme = PLATFORM_THEMES[post.platform];
  const postTypeConfig = POST_TYPE_CONFIGS[post.postType];

  if (compact) {
    // Month view: tiny square thumbnail
    return (
      <button
        onClick={onClick}
        title={`${postTypeConfig.label} · ${format(new Date(post.scheduledTime), 'HH:mm')}`}
        className={`relative w-7 h-7 rounded overflow-hidden ring-1 flex-shrink-0 ${theme.ring} transition-transform hover:scale-110`}
      >
        {showImg ? (
          <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className={`w-full h-full ${theme.bgDim} flex items-center justify-center text-[11px]`}>
            {postTypeConfig.icon}
          </div>
        )}
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${theme.bg} opacity-80`} />
      </button>
    );
  }

  // Week/day view: horizontal card
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 w-full border-l-2 border-l-${theme.bg.split('-')[1]}-500 bg-slate-800/70 hover:bg-slate-700/70 rounded-r-lg px-1.5 py-1 transition-all group`}
      style={{ borderLeftColor: theme.bg.includes('pink') ? '#ec4899' : theme.bg.includes('red') ? '#ef4444' : theme.bg.includes('purple') ? '#a855f7' : theme.bg.includes('orange') ? '#f97316' : '#94a3b8' }}
    >
      <div className={`w-7 h-7 rounded overflow-hidden flex-shrink-0 ring-1 ${theme.ring}`}>
        {showImg ? (
          <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className={`w-full h-full ${theme.bgDim} flex items-center justify-center text-[10px]`}>
            {postTypeConfig.icon}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[9px] text-slate-300 font-medium truncate leading-tight">{postTypeConfig.label}</p>
        <p className="text-[8px] text-slate-500 truncate">{format(new Date(post.scheduledTime), 'HH:mm')}</p>
      </div>
    </button>
  );
}

// ─── Missing Slot Card ────────────────────────────────────────────────────────

interface MissingCardProps {
  slot: TimeSlot;
  onClick?: () => void;
  compact?: boolean;
}

function MissingCard({ slot, onClick, compact = false }: MissingCardProps) {
  const postTypeConfig = POST_TYPE_CONFIGS[slot.postType];
  const theme = PLATFORM_THEMES[slot.platform];

  if (compact) {
    return (
      <button
        onClick={onClick}
        title={`Missing: ${postTypeConfig.label}`}
        className={`w-7 h-7 rounded border border-dashed border-red-500/30 flex-shrink-0 ${theme.bgDim} flex items-center justify-center opacity-50 hover:opacity-80 transition-opacity`}
      >
        <Plus className="w-3 h-3 text-red-400" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 w-full border-l-2 border-l-red-500/30 border border-dashed border-slate-700/40 rounded-r-lg px-1.5 py-1 opacity-50 hover:opacity-80 transition-opacity`}
    >
      <div className={`w-7 h-7 rounded overflow-hidden flex-shrink-0 ${theme.bgDim} flex items-center justify-center`}>
        <Plus className="w-3 h-3 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[9px] text-red-400/70 font-medium truncate leading-tight">{postTypeConfig.label}</p>
        <p className="text-[8px] text-slate-600 truncate">{slot.time}</p>
      </div>
    </button>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

interface DayViewProps {
  date: Date;
  model: Model;
  posts: Post[];
  onCreatePost: () => void;
}

function DayView({ date, model, posts, onCreatePost }: DayViewProps) {
  const timeGroups = useMemo(() => {
    const times = [...new Set(model.postingSchedule.map((s) => s.time))].sort();
    return times.map((time) => {
      const slots = model.postingSchedule.filter((s) => s.time === time);
      return {
        time,
        slots: slots.map((slot) => ({ slot, ...getSlotStatus(date, slot, posts, model.id) })),
      };
    });
  }, [model, date, posts]);

  const totalSlots = useMemo(() => timeGroups.reduce((acc, g) => acc + g.slots.length, 0), [timeGroups]);
  const scheduled = useMemo(
    () => timeGroups.reduce((acc, g) => acc + g.slots.filter((s) => s.status !== 'missing').length, 0),
    [timeGroups]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">{scheduled}/{totalSlots} slots filled</span>
        <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: totalSlots ? `${(scheduled / totalSlots) * 100}%` : '0%' }} />
        </div>
      </div>

      {timeGroups.length === 0 ? (
        <div className="card py-12 text-center text-slate-500">No posting schedule configured</div>
      ) : (
        <div className="space-y-2">
          {timeGroups.map(({ time, slots }) => {
            const allFilled = slots.every((s) => s.status !== 'missing');
            const anyMissing = slots.some((s) => s.status === 'missing');
            return (
              <div key={time} className={`card p-4 border ${anyMissing ? 'border-red-500/20' : allFilled ? 'border-green-500/20' : 'border-slate-700'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-base font-semibold text-slate-200">{time}</span>
                  <div className="flex items-center gap-1.5 text-xs">
                    {allFilled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400">All filled</span>
                      </>
                    ) : anyMissing ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400">{slots.filter((s) => s.status === 'missing').length} missing</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {slots.map(({ slot, status, post }) =>
                    post ? (
                      <PostCard key={slot.id} post={post} onClick={onCreatePost} />
                    ) : (
                      <MissingCard key={slot.id} slot={slot} onClick={onCreatePost} />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

interface WeekViewProps {
  weekStart: Date;
  model: Model;
  posts: Post[];
  onCreatePost: () => void;
  onDayClick: (date: Date) => void;
}

function WeekView({ weekStart, model, posts, onCreatePost, onDayClick }: WeekViewProps) {
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-slate-700/50">
        {days.map((day) => {
          const daySlots = model.postingSchedule.map((slot) => ({ slot, ...getSlotStatus(day, slot, posts, model.id) }));
          const filled = daySlots.filter((s) => s.status !== 'missing').length;
          const missing = daySlots.filter((s) => s.status === 'missing').length;
          const todayDay = isToday(day);

          return (
            <div key={day.toISOString()} className="flex flex-col min-w-0">
              {/* Day header */}
              <button
                onClick={() => onDayClick(day)}
                className={`flex flex-col items-center py-2.5 px-1 border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors ${todayDay ? 'bg-blue-600/15' : ''}`}
              >
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{format(day, 'EEE')}</span>
                <span className={`text-lg font-bold mt-0.5 ${todayDay ? 'text-blue-400' : 'text-slate-200'}`}>{format(day, 'd')}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {filled > 0 && <span className="text-[9px] text-green-400 font-medium">{filled}✓</span>}
                  {missing > 0 && <span className="text-[9px] text-red-400 font-medium">{missing}✗</span>}
                </div>
              </button>

              {/* Day post cards */}
              <div className="p-1 space-y-1 flex-1">
                {daySlots.map(({ slot, status, post }) =>
                  post ? <PostCard key={slot.id} post={post} onClick={onCreatePost} /> : <MissingCard key={slot.id} slot={slot} onClick={onCreatePost} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

interface MonthViewProps {
  month: Date;
  model: Model;
  posts: Post[];
  onDayClick: (date: Date) => void;
}

function MonthView({ month, model, posts, onDayClick }: MonthViewProps) {
  const monthStart = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);
  const monthEnd = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0), [month]);
  const calStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const calEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const allDays = useMemo(() => eachDayOfInterval({ start: calStart, end: calEnd }), [calStart, calEnd]);

  const getDayPosts = useCallback((day: Date) => getDayPosts(posts, model.id, day), [posts, model.id]);
  const getDayMissing = useCallback((day: Date) => getDayMissingCount(posts, model, day), [posts, model]);

  return (
    <div className="card overflow-hidden">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-slate-700/50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-700/30">
        {allDays.map((day) => {
          const inMonth = isSameMonth(day, month);
          const todayDay = isToday(day);
          const dayPosts = inMonth ? getDayPosts(day) : [];
          const missing = inMonth ? getDayMissing(day) : 0;
          const overflow = dayPosts.length > 4 ? dayPosts.length - 4 : 0;
          const visible = dayPosts.slice(0, 4);

          return (
            <button
              key={day.toISOString()}
              onClick={() => inMonth && onDayClick(day)}
              disabled={!inMonth}
              className={`min-h-[90px] p-1.5 text-left flex flex-col gap-1 transition-colors ${!inMonth ? 'opacity-20' : 'hover:bg-slate-800/40'} ${todayDay ? 'bg-blue-600/8' : ''}`}
            >
              {/* Date number */}
              <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${todayDay ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>
                {format(day, 'd')}
              </span>

              {/* Thumbnails grid (up to 4) */}
              {visible.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {visible.map((post) => (
                    <PostCard key={post.id} post={post} compact />
                  ))}
                  {overflow > 0 && (
                    <div className="w-7 h-7 rounded bg-slate-700/60 flex items-center justify-center text-[9px] text-slate-400 font-semibold">
                      +{overflow}
                    </div>
                  )}
                </div>
              )}

              {/* Missing indicator */}
              {inMonth && missing > 0 && <span className="text-[9px] text-red-400/70 mt-auto">{missing} missing</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export default function CalendarView() {
  const { models, selectedModelId, posts, setShowCreatePostModal, setEditingPost } = useStore();
  const [view, setView] = useState<CalendarViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFeedPreview, setShowFeedPreview] = useState(false);

  const selectedModel = useMemo(() => models.find((m) => m.id === selectedModelId), [models, selectedModelId]);

  const goNext = useCallback(() => {
    setCurrentDate((d) => navigateDate(d, 'next', view));
  }, [view]);

  const goPrev = useCallback(() => {
    setCurrentDate((d) => navigateDate(d, 'prev', view));
  }, [view]);

  const handleCreatePost = useCallback(() => {
    setEditingPost(null);
    setShowCreatePostModal(true);
  }, [setEditingPost, setShowCreatePostModal]);

  const handleDayClick = useCallback((day: Date) => {
    setCurrentDate(day);
    setView('day');
  }, []);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const titleLabel = useMemo(() => formatViewTitle(currentDate, view), [currentDate, view]);

  const todayStats = useMemo(() => (selectedModel ? calculateTodayStats(posts, selectedModel) : { total: 0, scheduled: 0, missing: 0 }), [posts, selectedModel]);

  if (!selectedModel) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Select a model to view the calendar</div>;
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 self-start">
          {(['day', 'week', 'month'] as CalendarViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${view === v ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-100'}`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-1 justify-center sm:justify-start">
          <button onClick={goPrev} className="btn-ghost p-1.5">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-xs px-2.5 py-1.5">
            Today
          </button>
          <button onClick={goNext} className="btn-ghost p-1.5">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-200 ml-1 hidden sm:inline">{titleLabel}</span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={() => setShowFeedPreview(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview Feed</span>
          </button>
          <button onClick={handleCreatePost} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" />
            Create Post
          </button>
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-300 sm:hidden">{titleLabel}</p>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>
          Today: <strong className="text-blue-400">{todayStats.scheduled}</strong>/{todayStats.total} scheduled
        </span>
        {todayStats.missing > 0 && <span className="text-red-400">⚠ {todayStats.missing} missing</span>}
      </div>

      {view === 'day' && <DayView date={currentDate} model={selectedModel} posts={posts} onCreatePost={handleCreatePost} />}
      {view === 'week' && <WeekView weekStart={weekStart} model={selectedModel} posts={posts} onCreatePost={handleCreatePost} onDayClick={handleDayClick} />}
      {view === 'month' && <MonthView month={currentDate} model={selectedModel} posts={posts} onDayClick={handleDayClick} />}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
        {(['instagram', 'tiktok', 'x', 'threads'] as Platform[]).map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded ${PLATFORM_THEMES[p].bg}`} />
            <span className="capitalize">{PLATFORM_THEMES[p].label}</span>
          </div>
        ))}
        <div className="border-l border-slate-700 pl-3 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded border border-dashed border-red-400/50" />
          Missing slot
        </div>
      </div>

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
