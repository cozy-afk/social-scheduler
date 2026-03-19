'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useStore, getVisibleModels } from '@/lib/store';
import {
  LayoutGrid, Calendar, FileText, Users, BarChart2,
  TrendingUp, Settings, Zap, ChevronDown, CalendarCheck, Copy,
  Trophy, Film, Layers, BookImage, LogOut,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { prefetchGalleryAssets } from '@/lib/gallery-cache';

const NAV_ITEMS = [
  { href: '/gallery', icon: LayoutGrid, label: 'Gallery' },
  { href: '/schedule', icon: CalendarCheck, label: 'Schedule' },
  { href: '/captions', icon: FileText, label: 'Captions' },
  { href: '/models', icon: Users, label: 'Models' },
  { href: '/clone-reel', icon: Film, label: 'Reel Creator' },
  { href: '/stories', icon: BookImage, label: 'Stories' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/research', icon: TrendingUp, label: 'Research' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

// ─── Daily Progress Widget ────────────────────────────────────────────────────

function DailyProgressWidget() {
  const { selectedModelId, posts } = useStore();
  const models = useStore(getVisibleModels);
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const target = selectedModel?.dailyTarget;

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const counts = useMemo(() => {
    const modelPosts = posts.filter(
      (p) => p.modelId === selectedModelId && p.status === 'completed' && p.scheduledTime.startsWith(todayStr)
    );
    let reels = 0, carousels = 0, stories = 0;
    for (const p of modelPosts) {
      if (p.postType.includes('reel')) reels++;
      else if (p.postType.includes('story')) stories++;
      else carousels++;
    }
    return { reels, carousels, stories };
  }, [posts, selectedModelId, todayStr]);

  if (!target) return null;

  const total = target.reels + target.carousels + target.stories;
  const done = Math.min(counts.reels, target.reels)
    + Math.min(counts.carousels, target.carousels)
    + Math.min(counts.stories, target.stories);
  const allDone = done >= total && total > 0;

  const rows: { icon: React.ReactNode; label: string; done: number; goal: number; color: string; bg: string }[] = [
    { icon: <Film className="w-3 h-3" />, label: 'Reels', done: counts.reels, goal: target.reels, color: '#A855F7', bg: 'rgba(168,85,247,0.15)' },
    { icon: <Layers className="w-3 h-3" />, label: 'Carousels', done: counts.carousels, goal: target.carousels, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    { icon: <BookImage className="w-3 h-3" />, label: 'Stories', done: counts.stories, goal: target.stories, color: '#EC4899', bg: 'rgba(236,72,153,0.15)' },
  ];

  return (
    <div className="px-3 py-3 border-t border-white/5 flex-shrink-0">
      <div className="rounded-xl p-3 space-y-2.5"
        style={{ background: allDone ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${allDone ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)'}` }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Today&apos;s Targets</p>
          {allDone && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
              <Trophy className="w-3 h-3" />
              Done!
            </div>
          )}
        </div>

        {/* Progress rows */}
        {rows.map((row) => {
          const pct = row.goal === 0 ? 100 : Math.min(100, (row.done / row.goal) * 100);
          const met = row.done >= row.goal;
          return (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5" style={{ color: row.color }}>
                  {row.icon}
                  <span className="text-[10px] font-medium">{row.label}</span>
                </div>
                <span className={`text-[10px] font-bold tabular-nums ${met ? 'text-green-400' : 'text-zinc-400'}`}>
                  {row.done}/{row.goal}
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: met ? '#22C55E' : row.color, opacity: met ? 1 : 0.8 }}
                />
              </div>
            </div>
          );
        })}

        {/* Celebration message */}
        {allDone && (
          <p className="text-[10px] text-center text-violet-300 font-medium pt-0.5">
            All targets met — great work!
          </p>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { selectedModelId, setSelectedModelId, currentUser } = useStore();
  const models = useStore(getVisibleModels);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)', boxShadow: '0 0 16px rgba(124,58,237,0.4)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">CreatorFlow</p>
            <p className="text-[10px] text-zinc-500 leading-tight">Content Scheduler</p>
          </div>
        </div>
      </div>

      {/* Model Switcher */}
      <div className="px-3 py-3 border-b border-white/5 flex-shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2 px-1">Active Model</p>
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-sm flex-shrink-0">
              {selectedModel?.profileImage || '👤'}
            </div>
            <span className="flex-1 text-left text-zinc-200 font-medium truncate text-xs">
              {selectedModel?.name || 'Select model'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {modelDropdownOpen && models.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden shadow-xl"
              style={{ background: '#1A1A22', border: '1px solid rgba(255,255,255,0.1)' }}>
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedModelId(m.id); setModelDropdownOpen(false); }}
                  onMouseEnter={() => { if (m.s3Folder && m.id !== selectedModelId) prefetchGalleryAssets(m.s3Folder, m.id); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors hover:bg-white/5"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center text-sm flex-shrink-0">
                    {m.profileImage || '👤'}
                  </div>
                  <span className={`truncate ${m.id === selectedModelId ? 'text-violet-300 font-semibold' : 'text-zinc-300'}`}>
                    {m.name}
                  </span>
                  {m.id === selectedModelId && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto no-scrollbar">
        <p className="section-title px-1 mb-2">Navigation</p>
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={isActive ? 'nav-item-active' : 'nav-item'}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Daily Progress */}
      <DailyProgressWidget />

      {/* User info */}
      <div className="px-3 py-3 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {currentUser?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-200 truncate">{currentUser?.name || 'Admin'}</p>
            <p className="text-[10px] text-zinc-600 capitalize">{currentUser?.role || 'admin'}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/splash' })}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors flex-shrink-0"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
