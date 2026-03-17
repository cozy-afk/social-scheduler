'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, TrendingUp, Clock, Eye, Heart, Users,
  BarChart2, AlertCircle, ExternalLink, Play,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaProfile {
  id: string;
  name: string;
  username: string;
  profile_picture_url?: string;
  followers_count: number;
  media_count: number;
  biography?: string;
}

interface MetaInsightMetric {
  name: string;
  period: string;
  values: Array<{ value: number; end_time: string }>;
}

interface MediaInsightMetric {
  name: string;
  values: Array<{ value: number }>;
}

interface MetaMediaItem {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  thumbnail_url?: string;
  media_url?: string;
  permalink: string;
  timestamp: string;
  caption?: string;
  like_count: number;
  comments_count: number;
  insights?: { data: MediaInsightMetric[] };
}

interface OnlineFollowersEntry {
  value: Record<string, number>;
  end_time: string;
}

interface MetaInsightsPayload {
  profile: MetaProfile;
  insights: { data: MetaInsightMetric[] };
  onlineFollowers?: {
    data?: Array<{ name: string; values: OnlineFollowersEntry[] }>;
    error?: { message: string };
  };
  media: { data: MetaMediaItem[] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMediaMetric(media: MetaMediaItem, name: string): number {
  const m = media.insights?.data?.find((d) => d.name === name);
  return m?.values?.[0]?.value ?? 0;
}

function getAccountMetricSum(data: MetaInsightMetric[], name: string): number {
  const metric = data.find((d) => d.name === name);
  if (!metric) return 0;
  return metric.values.reduce((sum, v) => sum + (v.value ?? 0), 0);
}

/**
 * Aggregates online_followers API data into a 24-element hourly array (average per hour).
 * The API returns daily snapshots: each value is a {0: count, ..., 23: count} object.
 */
function aggregateOnlineFollowers(
  onlineFollowers: MetaInsightsPayload['onlineFollowers']
): number[] | null {
  const values = onlineFollowers?.data?.[0]?.values ?? [];
  if (values.length === 0 || onlineFollowers?.error) return null;

  const totals = new Array(24).fill(0) as number[];
  const counts = new Array(24).fill(0) as number[];
  for (const entry of values) {
    for (let h = 0; h < 24; h++) {
      const v = entry.value?.[String(h)] ?? 0;
      totals[h] += v;
      if (v > 0) counts[h]++;
    }
  }
  const result = totals.map((t, h) => (counts[h] > 0 ? Math.round(t / counts[h]) : 0));
  // Return null if all zeros (metric unavailable)
  return result.some((v) => v > 0) ? result : null;
}

/**
 * Derives best posting hours from historical post performance.
 * Groups posts by hour of day and returns average total_interactions per hour.
 * Returns a 24-element array indexed 0–23.
 */
function deriveHourlyPerformance(media: MetaMediaItem[]): number[] {
  const buckets = new Array(24).fill(0) as number[];
  const counts = new Array(24).fill(0) as number[];

  for (const m of media) {
    if (!m.timestamp) continue;
    const hour = new Date(m.timestamp).getHours();
    const interactions = getMediaMetric(m, 'total_interactions');
    buckets[hour] += interactions;
    counts[hour]++;
  }

  return buckets.map((total, h) =>
    counts[h] > 0 ? Math.round(total / counts[h]) : 0
  );
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Best Posting Time ────────────────────────────────────────────────────────

const LABEL_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

function BestPostingTime({
  hourlyData,
  source,
  postCount,
}: {
  hourlyData: number[];
  source: 'followers' | 'performance';
  postCount?: number;
}) {
  const max = Math.max(...hourlyData, 1);
  const hasData = hourlyData.some((v) => v > 0);

  if (!hasData) return null;

  const topHours = [...hourlyData]
    .map((v, h) => ({ h, v }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map((x) => x.h);

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Clock className="w-4 h-4 text-pink-400 flex-shrink-0" />
        <h4 className="font-semibold text-white text-sm">Best Time to Post</h4>
        <span className="text-xs text-slate-500 ml-auto">
          {source === 'followers'
            ? 'Follower online activity (last 30 days)'
            : `Avg interactions by hour — last ${postCount ?? ''} posts`}
        </span>
      </div>

      {/* Top hour badges */}
      <div className="flex gap-2 flex-wrap">
        {topHours.map((h, i) => (
          <div
            key={h}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
              i === 0
                ? 'bg-pink-500/20 border border-pink-500/40 text-pink-300'
                : 'bg-slate-700/60 border border-slate-600/60 text-slate-300'
            }`}
          >
            {i === 0 && <span className="text-yellow-400">★</span>}
            {formatHour(h)}
            {i === 0 && (
              <span className="text-pink-400/60 text-[10px]">
                ~{formatK(hourlyData[h])} avg
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-px" style={{ height: 52 }}>
        {hourlyData.map((v, h) => {
          const pct = (v / max) * 100;
          const isTop = topHours[0] === h;
          const isGood = topHours.includes(h);
          return (
            <div
              key={h}
              title={`${formatHour(h)}: ~${formatK(v)} avg interactions`}
              className="flex-1 rounded-sm transition-all cursor-default"
              style={{
                height: `${Math.max(pct, v > 0 ? 4 : 2)}%`,
                backgroundColor:
                  v === 0
                    ? 'rgb(100 116 139 / 0.15)'
                    : isTop
                    ? 'rgb(236 72 153 / 0.85)'
                    : isGood
                    ? 'rgb(236 72 153 / 0.45)'
                    : 'rgb(100 116 139 / 0.35)',
              }}
            />
          );
        })}
      </div>

      {/* Hour labels */}
      <div className="flex" style={{ marginTop: -2 }}>
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="flex-1 text-center text-[9px] text-slate-600">
            {LABEL_HOURS.includes(h) ? (
              <span className="text-slate-500">{formatHour(h)}</span>
            ) : (
              ''
            )}
          </span>
        ))}
      </div>

      <p className="text-[10px] text-slate-600">
        {source === 'followers'
          ? 'Based on when your followers are most active online. Post within the top windows for maximum visibility.'
          : 'Based on post publish timestamps and historical engagement. Hours with no bar had no posts published.'}
      </p>
    </div>
  );
}

// ─── Top Posts Grid ───────────────────────────────────────────────────────────

function TopPostsGrid({ media }: { media: MetaMediaItem[] }) {
  const sorted = [...media]
    .map((m) => ({ ...m, _total: getMediaMetric(m, 'total_interactions') }))
    .sort((a, b) => b._total - a._total)
    .slice(0, 6);

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-pink-400" />
        <h4 className="font-semibold text-white text-sm">Top Performing Posts</h4>
        <span className="text-xs text-slate-500 ml-auto">By total interactions</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {sorted.map((post, idx) => {
          const reach = getMediaMetric(post, 'reach');
          const views = getMediaMetric(post, 'views');
          const saves = getMediaMetric(post, 'saved');
          const avgWatch = getMediaMetric(post, 'ig_reels_avg_watch_time');
          const imgUrl = post.thumbnail_url || post.media_url;
          return (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-pink-500/50 transition-all"
            >
              {/* Rank badge */}
              {idx < 3 && (
                <div className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-yellow-400">#{idx + 1}</span>
                </div>
              )}
              {/* Thumbnail */}
              <div className="aspect-square bg-slate-700 relative">
                {imgUrl ? (
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    {post.media_type === 'VIDEO' ? (
                      <Play className="w-8 h-8" />
                    ) : (
                      <Eye className="w-8 h-8" />
                    )}
                  </div>
                )}
                {/* Type badge */}
                <div className="absolute top-1.5 left-1.5">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      post.media_type === 'VIDEO'
                        ? 'bg-purple-600/90 text-white'
                        : post.media_type === 'CAROUSEL_ALBUM'
                        ? 'bg-blue-600/90 text-white'
                        : 'bg-slate-700/90 text-slate-300'
                    }`}
                  >
                    {post.media_type === 'CAROUSEL_ALBUM'
                      ? 'Carousel'
                      : post.media_type === 'VIDEO'
                      ? 'Reel'
                      : 'Post'}
                  </span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-white" />
                </div>
              </div>
              {/* Stats */}
              <div className="px-2 py-1.5 space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5" /> {formatK(post.like_count)}
                  </span>
                  <span className="text-slate-400 flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5" /> {formatK(reach)}
                  </span>
                </div>
                <div className="text-[10px] text-pink-400 font-medium">
                  {formatK(post._total)} interactions
                </div>
                {(views > 0 || saves > 0 || avgWatch > 0) && (
                  <div className="flex justify-between text-[10px] text-slate-500">
                    {views > 0 && <span>{formatK(views)} views</span>}
                    {avgWatch > 0 && <span>{(avgWatch / 1000).toFixed(1)}s avg watch</span>}
                    {saves > 0 && !avgWatch && <span>{formatK(saves)} saves</span>}
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Content Type Breakdown ───────────────────────────────────────────────────

type MediaType = 'VIDEO' | 'CAROUSEL_ALBUM' | 'IMAGE';

const TYPE_CONFIG: Record<MediaType, { label: string; color: string; bg: string; border: string }> =
  {
    VIDEO: {
      label: 'Reels',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
    },
    CAROUSEL_ALBUM: {
      label: 'Carousels',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
    },
    IMAGE: {
      label: 'Posts',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
    },
  };

function ContentTypeBreakdown({ media }: { media: MetaMediaItem[] }) {
  const buckets: Record<MediaType, MetaMediaItem[]> = {
    VIDEO: [],
    CAROUSEL_ALBUM: [],
    IMAGE: [],
  };

  for (const m of media) {
    if (m.media_type in buckets) {
      buckets[m.media_type as MediaType].push(m);
    }
  }

  const stats = (Object.entries(buckets) as [MediaType, MetaMediaItem[]][])
    .filter(([, posts]) => posts.length > 0)
    .map(([type, posts]) => {
      const totalInt = posts.reduce((s, m) => s + getMediaMetric(m, 'total_interactions'), 0);
      const totalReach = posts.reduce((s, m) => s + getMediaMetric(m, 'reach'), 0);
      const totalViews = posts.reduce((s, m) => s + getMediaMetric(m, 'views'), 0);
      const avgInt = Math.round(totalInt / posts.length);
      const avgReach = Math.round(totalReach / posts.length);
      const avgViews = Math.round(totalViews / posts.length);
      const engRate = avgReach > 0 ? ((avgInt / avgReach) * 100).toFixed(1) : '0.0';
      return { type, posts, avgInt, avgReach, avgViews, engRate, ...TYPE_CONFIG[type] };
    })
    .sort((a, b) => b.avgInt - a.avgInt);

  if (stats.length === 0) return null;

  const maxAvgInt = Math.max(...stats.map((s) => s.avgInt), 1);

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-pink-400" />
        <h4 className="font-semibold text-white text-sm">Content Type Performance</h4>
      </div>
      <div className="space-y-3">
        {stats.map((s, i) => (
          <div key={s.type} className={`rounded-xl border px-4 py-3 ${s.bg} ${s.border}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {i === 0 && <span className="text-yellow-400 text-xs">★</span>}
                <span className={`font-semibold text-sm ${s.color}`}>{s.label}</span>
                <span className="text-xs text-slate-500">
                  {s.posts.length} post{s.posts.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-slate-300 font-medium">
                {formatK(s.avgInt)} avg interactions
              </span>
            </div>
            {/* Relative bar */}
            <div className="h-1 bg-slate-700/60 rounded-full mb-2">
              <div
                className={`h-1 rounded-full ${s.color.replace('text-', 'bg-')}`}
                style={{ width: `${(s.avgInt / maxAvgInt) * 100}%` }}
              />
            </div>
            <div className="flex gap-4 flex-wrap text-xs text-slate-400">
              <span>
                Avg reach: <strong className="text-slate-200">{formatK(s.avgReach)}</strong>
              </span>
              <span>
                Eng. rate: <strong className="text-slate-200">{s.engRate}%</strong>
              </span>
              {s.avgViews > 0 && (
                <span>
                  Avg views: <strong className="text-slate-200">{formatK(s.avgViews)}</strong>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Growth Trend ─────────────────────────────────────────────────────────────

function GrowthTrend({ insightsList }: { insightsList: MetaInsightMetric[] }) {
  const followsMetric = insightsList.find((d) => d.name === 'follows_and_unfollows');
  if (!followsMetric || followsMetric.values.length === 0) return null;

  const netGrowth = followsMetric.values.reduce((s, v) => s + (v.value ?? 0), 0);
  const isPositive = netGrowth >= 0;

  const vals = followsMetric.values;
  const last7 = vals.slice(-7).reduce((s, v) => s + (v.value ?? 0), 0);
  const prior7 = vals.slice(-14, -7).reduce((s, v) => s + (v.value ?? 0), 0);
  const trend = prior7 !== 0 ? ((last7 - prior7) / Math.abs(prior7)) * 100 : 0;

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
        <Users className="w-5 h-5 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">Net Follower Growth (28d)</p>
        <p
          className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {isPositive ? '+' : ''}
          {formatK(netGrowth)}
        </p>
      </div>
      {prior7 !== 0 && (
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-500">vs prior week</p>
          <p
            className={`text-sm font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function ModelInsights({ accountId, accessToken }: { accountId: string; accessToken?: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MetaInsightsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ accountId });
      if (accessToken) params.set('accessToken', accessToken);
      const res = await fetch(`/api/meta/insights?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data as MetaInsightsPayload);
      } else {
        setError(json.error || 'Failed to load insights');
      }
    } catch {
      setError('Network error — could not reach the API');
    } finally {
      setLoading(false);
    }
  }, [accountId, accessToken]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ── No account ID ──
  if (!accountId) {
    return (
      <div className="card p-8 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400" />
        <p className="text-sm font-semibold text-slate-200">No Instagram Account Linked</p>
        <p className="text-xs text-slate-500 max-w-xs">
          Enter the Instagram Business Account ID above and save to unlock insights.
        </p>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <RefreshCw className="w-6 h-6 text-pink-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading Instagram insights…</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="card p-5 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">Failed to load insights</p>
            <p className="text-xs text-slate-400 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchInsights}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { profile, insights, onlineFollowers, media } = data;
  const mediaList = media?.data ?? [];
  const insightsList = insights?.data ?? [];

  const totalReach = getAccountMetricSum(insightsList, 'reach');
  const totalInteractions = getAccountMetricSum(insightsList, 'total_interactions');
  const accountsEngaged = getAccountMetricSum(insightsList, 'accounts_engaged');
  const avgEngRate =
    totalReach > 0 ? ((totalInteractions / totalReach) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="card p-4 flex items-center gap-3">
        {profile.profile_picture_url ? (
          <img
            src={profile.profile_picture_url}
            alt=""
            className="w-12 h-12 rounded-full border-2 border-pink-500/50 flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-pink-500/20 border-2 border-pink-500/30 flex items-center justify-center flex-shrink-0 text-pink-400 font-bold text-lg">
            {profile.username?.charAt(0).toUpperCase() ?? 'I'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">@{profile.username}</p>
          {profile.biography && (
            <p className="text-xs text-slate-400 truncate">{profile.biography}</p>
          )}
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold text-white">{formatK(profile.followers_count)}</p>
            <p className="text-[10px] text-slate-500">followers</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-white">{formatK(profile.media_count)}</p>
            <p className="text-[10px] text-slate-500">posts</p>
          </div>
          <button
            onClick={fetchInsights}
            className="btn-ghost p-2 text-slate-500 hover:text-white"
            title="Refresh insights"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <Eye className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{formatK(totalReach)}</p>
          <p className="text-[10px] text-slate-500">Total Reach (28d)</p>
        </div>
        <div className="card p-3 text-center">
          <Heart className="w-4 h-4 text-pink-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{formatK(totalInteractions)}</p>
          <p className="text-[10px] text-slate-500">Interactions (28d)</p>
        </div>
        <div className="card p-3 text-center">
          <Users className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{formatK(accountsEngaged)}</p>
          <p className="text-[10px] text-slate-500">Engaged Accounts</p>
        </div>
        <div className="card p-3 text-center">
          <TrendingUp className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{avgEngRate}%</p>
          <p className="text-[10px] text-slate-500">Eng. Rate</p>
        </div>
      </div>

      {/* Follower growth trend */}
      <GrowthTrend insightsList={insightsList} />

      {/* Best time to post — prefer online_followers data, fall back to post performance */}
      {(() => {
        const followerHours = aggregateOnlineFollowers(onlineFollowers);
        if (followerHours) {
          return <BestPostingTime hourlyData={followerHours} source="followers" />;
        }
        if (mediaList.length > 0) {
          const perfHours = deriveHourlyPerformance(mediaList);
          return <BestPostingTime hourlyData={perfHours} source="performance" postCount={mediaList.length} />;
        }
        return null;
      })()}

      {/* Top posts */}
      {mediaList.length > 0 && <TopPostsGrid media={mediaList} />}

      {/* Content type breakdown */}
      {mediaList.length > 0 && <ContentTypeBreakdown media={mediaList} />}
    </div>
  );
}
