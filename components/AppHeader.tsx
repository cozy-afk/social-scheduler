'use client';

import { useStore } from '@/lib/store';
import ModelSwitcher from '@/components/ModelSwitcher';
import { Users, Calendar, FileText, LayoutGrid, Zap, Boxes, BarChart2, Settings, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import type { ActivePage } from '@/types/utils';

interface AppHeaderProps {
  activePage: ActivePage;
  isVA?: boolean;
}

export default function AppHeader({ activePage, isVA = false }: AppHeaderProps) {
  const { currentUser } = useStore();

  return (
    <div className="sticky top-0 z-40">
      {/* Top header */}
      <header className="bg-slate-900 border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-white leading-tight">Social Scheduler</h1>
                <p className="text-xs text-slate-400 leading-tight hidden sm:block">
                  {isVA ? 'VA Task Queue' : 'Content Management'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {!isVA && <ModelSwitcher />}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5">
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{currentUser?.name || (isVA ? 'VA User' : 'Admin User')}</span>
                <span className="sm:hidden">{isVA ? 'VA' : 'Admin'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-900/95 backdrop-blur border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {isVA ? (
              /* VA-only navigation — no admin links */
              <Link href="#" className={activePage === 'va' ? 'nav-link-active' : 'nav-link'}>
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">My Tasks</span>
              </Link>
            ) : (
              <>
                <Link href="/gallery" className={activePage === 'gallery' ? 'nav-link-active' : 'nav-link'}>
                  <LayoutGrid className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Gallery</span>
                </Link>
                <Link href="/" className={activePage === 'calendar' ? 'nav-link-active' : 'nav-link'}>
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Calendar</span>
                </Link>
                <Link href="/captions" className={activePage === 'captions' ? 'nav-link-active' : 'nav-link'}>
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Post References</span>
                </Link>
                <Link href="/models" className={activePage === 'models' ? 'nav-link-active' : 'nav-link'}>
                  <Boxes className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Models</span>
                </Link>
                <Link href="/analytics" className={activePage === 'analytics' ? 'nav-link-active' : 'nav-link'}>
                  <BarChart2 className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Analytics</span>
                </Link>
                <Link href="/research" className={activePage === 'research' ? 'nav-link-active' : 'nav-link'}>
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Research</span>
                </Link>
                <Link href="/settings" className={activePage === 'settings' ? 'nav-link-active' : 'nav-link'}>
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Settings</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
