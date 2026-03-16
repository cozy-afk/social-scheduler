'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { mockModels, mockPosts } from '@/lib/mockData';
import { decodeVAToken } from '@/lib/magic-links';
import AppHeader from '@/components/AppHeader';
import VATaskQueue from '@/components/VATaskQueue';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function VATokenPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const { setModels, setSelectedModelId, setCurrentUser, setPosts } = useStore();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [vaName, setVaName] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    const payload = decodeVAToken(token);
    if (!payload) {
      setStatus('invalid');
      return;
    }

    // Check expiry
    if (new Date() > new Date(payload.expiresAt)) {
      setStatus('invalid');
      return;
    }

    // Bootstrap store with VA context
    const va = {
      id: payload.vaId,
      email: '',
      name: payload.vaName,
      role: 'va' as const,
      assignedModels: payload.assignedModels,
    };

    const assignedModels = mockModels.filter((m) => payload.assignedModels.includes(m.id));

    setCurrentUser(va);
    setModels(assignedModels);
    if (assignedModels.length > 0) setSelectedModelId(assignedModels[0].id);
    setPosts(mockPosts.filter((p) => payload.assignedModels.includes(p.modelId)));
    setVaName(payload.vaName);
    setStatus('valid');
  }, [token, setCurrentUser, setModels, setSelectedModelId, setPosts]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading your task queue…</span>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="card p-8 max-w-sm w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Invalid or Expired Link</h2>
          <p className="text-slate-400 text-sm">
            This link is no longer valid. Please ask your manager to generate a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <AppHeader activePage="va" isVA />
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        <VATaskQueue />
      </main>
    </div>
  );
}
