'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockVAUsers } from '@/lib/mockData';
import AppHeader from '@/components/AppHeader';
import Link from 'next/link';
import { Link2, Users, ArrowRight, Lock } from 'lucide-react';

export default function VAInfoPage() {
  const { setModels, setSelectedModelId, setCurrentUser, setVAUsers } = useStore();

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setVAUsers(mockVAUsers);
  }, [setModels, setSelectedModelId, setCurrentUser, setVAUsers]);

  return (
    <div className="min-h-screen bg-slate-950">
      <AppHeader activePage="models" />
      <main className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">VA Access is Link-Only</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Virtual assistants can only access their task queue through a unique magic link generated per model.
            There is no shared VA login — each link is scoped to a specific VA and expires automatically.
          </p>
        </div>

        <div className="card p-5 w-full text-left space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Link2 className="w-4 h-4 text-blue-400" />
            How to generate a VA link
          </div>
          <ol className="space-y-3">
            {[
              'Go to the Models page',
              'Open a model\'s settings (⚙ icon)',
              'Click the VA Links tab',
              'Click "Generate Link" next to a VA',
              'Copy and send the link to your VA',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="w-5 h-5 bg-blue-600/30 border border-blue-500/40 rounded-full flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link href="/models" className="btn-primary flex items-center justify-center gap-2 flex-1">
            <Users className="w-4 h-4" />
            Go to Models
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-xs text-slate-500">
          VA links expire after 30 days. You can revoke a link at any time from the model settings page.
        </p>
      </main>
    </div>
  );
}
