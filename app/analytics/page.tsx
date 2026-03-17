'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import type { MetaConfig } from '@/lib/store';
import { mockModels, mockAdmin } from '@/lib/mockData';
import AppHeader from '@/components/AppHeader';
import {
  BarChart2, TrendingUp, Users, Heart, MessageCircle,
  Search, Plus, X, Loader2, AlertCircle, ExternalLink,
  RefreshCw, ChevronDown, Instagram, Zap, Check,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IGProfile {
  id: string;
  name: string;
  username: string;
  profile_picture_url?: string;
  followers_count: number;
  media_count: number;
  biography?: string;
  website?: string;
}

interface IGMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  caption?: string;
  insights?: { data: { name: string; values: { value: number }[] }[] };
}

interface TrendPost {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  caption?: string;
  engagement: number;
  hashtag?: string;
  handle?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function engagementRate(post: IGMedia, followers: number) {
  if (!followers) return '0%';
  return (((post.like_count + post.comments_count) / followers) * 100).toFixed(2) + '%';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'text-blue-400' }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="card p-4">
      <div className={`flex items-center gap-2 text-xs mb-2 ${color}`}>
        {icon}
        <span className="text-slate-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function MediaThumb({ post, followers }: { post: IGMedia; followers: number }) {
  const img = post.thumbnail_url || post.media_url;
  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-square rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all"
    >
      {img ? (
        <img src={img} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
          <Instagram className="w-8 h-8 text-slate-600" />
        </div>
      )}
      <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
        <div className="flex items-center gap-1 text-white text-sm font-semibold">
          <Heart className="w-3.5 h-3.5 text-pink-400" /> {fmtNum(post.like_count)}
        </div>
        <div className="flex items-center gap-1 text-white text-sm">
          <MessageCircle className="w-3.5 h-3.5 text-blue-400" /> {fmtNum(post.comments_count)}
        </div>
        <div className="text-xs text-slate-300 mt-1">{engagementRate(post, followers)}</div>
        <ExternalLink className="w-3 h-3 text-slate-400 mt-1" />
      </div>
    </a>
  );
}

function TrendPostCard({ post, rank }: { post: TrendPost; rank: number }) {
  const img = post.thumbnail_url || post.media_url;
  return (
    <div className="card p-3 flex gap-3 items-start">
      <span className="text-xl font-black text-slate-600 w-7 flex-shrink-0 text-center leading-tight mt-0.5">
        {rank}
      </span>
      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Instagram className="w-5 h-5 text-slate-600" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {post.caption && (
          <p className="text-xs text-slate-300 line-clamp-2 mb-1">{post.caption}</p>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          {post.hashtag && (
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">#{post.hashtag}</span>
          )}
          {post.handle && (
            <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">@{post.handle}</span>
          )}
          <span className="text-slate-500">{new Date(post.timestamp).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 text-pink-400 text-sm font-semibold">
          <Heart className="w-3.5 h-3.5" /> {fmtNum(post.like_count)}
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
          <MessageCircle className="w-3 h-3" /> {fmtNum(post.comments_count)}
        </div>
        <a href={post.permalink} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-blue-400 transition-colors mt-1 ml-auto" />
        </a>
      </div>
    </div>
  );
}

// ─── Model Analytics Tab ─────────────────────────────────────────────────────

function ModelAnalyticsTab() {
  const { models, metaConfig } = useStore();
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const [accountId, setAccountId] = useState(metaConfig?.accountId || '');
  const [accessToken, setAccessToken] = useState(metaConfig?.accessToken || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<{ profile: IGProfile; media: { data: IGMedia[] } } | null>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  const fetchInsights = useCallback(async () => {
    if (!accountId || !accessToken) {
      setError('Enter your Instagram Business Account ID and Access Token below.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/meta/insights?accountId=${accountId}&accessToken=${accessToken}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  }, [accountId, accessToken]);

  const topPosts = data
    ? [...(data.media?.data || [])].sort(
        (a, b) => b.like_count + b.comments_count - (a.like_count + a.comments_count)
      ).slice(0, 6)
    : [];

  return (
    <div className="space-y-5">
      {/* Model selector + connection */}
      <div className="card p-5 space-y-4">
        {metaConfig && !data && (
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <Check className="w-3.5 h-3.5" />
            Credentials loaded from Settings — click Fetch Insights to load data.
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-lg">
            {selectedModel?.profileImage || '👤'}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{selectedModel?.name || 'Select a model'}</h3>
            <p className="text-xs text-slate-400">Connect Instagram Business Account</p>
          </div>
          <select
            value={selectedModelId}
            onChange={(e) => { setSelectedModelId(e.target.value); setData(null); }}
            className="input-dark text-sm py-1.5 pr-8"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.profileImage} {m.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-dark">Instagram Business Account ID</label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="17841400008460056"
              className="input-dark"
            />
          </div>
          <div>
            <label className="label-dark">Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAxxxxx..."
              className="input-dark"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Credentials are managed in{' '}
          <Link href="/settings?tab=integrations" className="text-blue-400 hover:underline">
            Settings → Integrations
          </Link>
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? 'Loading…' : 'Fetch Insights'}
          </button>
          {data && (
            <button onClick={fetchInsights} className="btn-ghost text-sm flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
          {error && (
            <div className="flex items-center gap-1.5 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label="Followers"
              value={fmtNum(data.profile.followers_count)}
              color="text-pink-400"
            />
            <StatCard
              icon={<Instagram className="w-4 h-4" />}
              label="Total Posts"
              value={fmtNum(data.profile.media_count)}
              color="text-purple-400"
            />
            <StatCard
              icon={<Heart className="w-4 h-4" />}
              label="Avg Likes"
              value={fmtNum(
                Math.round(
                  topPosts.reduce((s, p) => s + p.like_count, 0) / Math.max(topPosts.length, 1)
                )
              )}
              color="text-red-400"
            />
            <StatCard
              icon={<MessageCircle className="w-4 h-4" />}
              label="Avg Comments"
              value={fmtNum(
                Math.round(
                  topPosts.reduce((s, p) => s + p.comments_count, 0) / Math.max(topPosts.length, 1)
                )
              )}
              color="text-blue-400"
            />
          </div>

          {/* Profile bio */}
          {data.profile.biography && (
            <div className="card p-4">
              <p className="text-xs text-slate-400 mb-1">@{data.profile.username}</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{data.profile.biography}</p>
              {data.profile.website && (
                <a
                  href={data.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline mt-1 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> {data.profile.website}
                </a>
              )}
            </div>
          )}

          {/* Top posts */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Top Posts by Engagement</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {topPosts.map((post) => (
                <MediaThumb key={post.id} post={post} followers={data.profile.followers_count} />
              ))}
            </div>
          </div>

          {/* All recent posts */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Posts</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(data.media?.data || []).slice(0, 12).map((post) => (
                <MediaThumb key={post.id} post={post} followers={data.profile.followers_count} />
              ))}
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="card py-16 flex flex-col items-center text-center">
          <BarChart2 className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No data yet</p>
          <p className="text-slate-600 text-sm mt-1">Enter your account credentials and click Fetch Insights</p>
        </div>
      )}
    </div>
  );
}

// ─── Niche Trends Tab ────────────────────────────────────────────────────────

function NicheTrendsTab() {
  const { metaConfig } = useStore();
  const [hashtags, setHashtags] = useState<string[]>(['fitness', 'lifestyle']);
  const [handles, setHandles] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [handleInput, setHandleInput] = useState('');
  const [accessToken, setAccessToken] = useState(metaConfig?.accessToken || '');
  const [igUserId, setIgUserId] = useState(metaConfig?.igUserId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<TrendPost[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) setHashtags([...hashtags, tag]);
    setHashtagInput('');
  };

  const addHandle = () => {
    const h = handleInput.trim().replace(/^@/, '');
    if (h && !handles.includes(h)) setHandles([...handles, h]);
    setHandleInput('');
  };

  const fetchTrends = async () => {
    if (!accessToken || !igUserId) {
      setShowConfig(true);
      setError('Enter your Access Token and IG User ID in the config panel.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/meta/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hashtags, handles, accessToken, igUserId }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResults(json.posts || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch trends');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Config + inputs */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Niche Trend Finder</h3>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            API Config
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showConfig && (
          <div className="pt-1 border-t border-slate-700/60 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label-dark">Access Token</label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAxxxxx..."
                  className="input-dark"
                />
              </div>
              <div>
                <label className="label-dark">Instagram User ID</label>
                <input
                  type="text"
                  value={igUserId}
                  onChange={(e) => setIgUserId(e.target.value)}
                  placeholder="17841400008460056"
                  className="input-dark"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Credentials are managed in{' '}
              <Link href="/settings?tab=integrations" className="text-blue-400 hover:underline">
                Settings → Integrations
              </Link>
            </p>
          </div>
        )}

        {/* Hashtag input */}
        <div>
          <label className="label-dark">Hashtags</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
              placeholder="e.g. fitness"
              className="input-dark flex-1"
            />
            <button onClick={addHashtag} className="btn-secondary flex items-center gap-1 text-sm">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs px-2.5 py-1 rounded-full"
                >
                  #{tag}
                  <button onClick={() => setHashtags(hashtags.filter((t) => t !== tag))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Handle input */}
        <div>
          <label className="label-dark">Account Handles</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHandle()}
              placeholder="e.g. cristiano"
              className="input-dark flex-1"
            />
            <button onClick={addHandle} className="btn-secondary flex items-center gap-1 text-sm">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {handles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {handles.map((h) => (
                <span
                  key={h}
                  className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs px-2.5 py-1 rounded-full"
                >
                  @{h}
                  <button onClick={() => setHandles(handles.filter((x) => x !== h))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTrends}
            disabled={loading || (hashtags.length === 0 && handles.length === 0)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Searching…' : 'Find Trending Posts'}
          </button>
          {error && (
            <div className="flex items-center gap-1.5 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">
              Top {results.length} Posts by Engagement
            </h3>
            <span className="text-xs text-slate-500">Sorted by likes + comments</span>
          </div>
          {results.map((post, i) => (
            <TrendPostCard key={post.id} post={post} rank={i + 1} />
          ))}
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="card py-16 flex flex-col items-center text-center">
          <TrendingUp className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No results yet</p>
          <p className="text-slate-600 text-sm mt-1">Add hashtags or handles and click Find Trending Posts</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { setModels, setSelectedModelId, setCurrentUser } = useStore();
  const [tab, setTab] = useState<'models' | 'trends'>('models');

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
  }, [setModels, setSelectedModelId, setCurrentUser]);

  return (
    <div className="min-h-screen bg-slate-950">
      <AppHeader activePage="analytics" />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Analytics</h2>
            <p className="text-sm text-slate-400">Model performance & niche trend discovery</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-700/60">
          {([
            { id: 'models', label: 'Model Analytics', icon: <BarChart2 className="w-4 h-4" /> },
            { id: 'trends', label: 'Niche Trends', icon: <TrendingUp className="w-4 h-4" /> },
          ] as const).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                tab === id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {tab === 'models' && <ModelAnalyticsTab />}
        {tab === 'trends' && <NicheTrendsTab />}
      </main>
    </div>
  );
}
