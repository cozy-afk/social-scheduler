'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { mockModels, mockPosts } from '@/lib/mockData';
import { decodeVAToken } from '@/lib/magic-links';
import VATaskQueue from '@/components/VATaskQueue';
import { AlertTriangle, Loader2, Zap, ChevronDown } from 'lucide-react';
import { Model } from '@/types/models';

// ─── Install banner (shown once if not in standalone mode) ────────────────────

function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile Safari when NOT already installed as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const dismissed = sessionStorage.getItem('va_install_dismissed');
    if (!isStandalone && !dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="mx-4 mt-3 rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: 'rgba(124,58,237,0.12)',
        border: '1px solid rgba(124,58,237,0.3)',
      }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(124,58,237,0.25)' }}>
        <Zap className="w-4 h-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white">Save to Home Screen</p>
        <p className="text-[11px] text-zinc-400 leading-snug">
          Tap <span className="text-white font-semibold">Share → Add to Home Screen</span> for quick access
        </p>
      </div>
      <button
        onClick={() => { sessionStorage.setItem('va_install_dismissed', '1'); setVisible(false); }}
        className="text-zinc-500 text-lg leading-none px-1 flex-shrink-0"
      >
        ×
      </button>
    </div>
  );
}

// ─── Model Tab Bar (if multiple models) ──────────────────────────────────────

function ModelTabBar({
  models,
  selectedId,
  onChange,
}: {
  models: Model[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  if (models.length <= 1) return null;

  return (
    <div
      className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar"
    >
      {models.map((m) => {
        const active = m.id === selectedId;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all active:scale-95"
            style={{
              background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${active ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: active ? '#C4B5FD' : '#71717A',
            }}
          >
            <span className="text-base leading-none">{m.profileImage}</span>
            {m.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VATokenPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const { setModels, setSelectedModelId, setCurrentUser, setPosts, selectedModelId, models } = useStore();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [vaName, setVaName] = useState('');
  const [assignedModels, setAssignedModels] = useState<Model[]>([]);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    const payload = decodeVAToken(token);
    if (!payload) { setStatus('invalid'); return; }

    const va = {
      id: payload.vaId,
      email: '',
      name: payload.vaName,
      role: 'va' as const,
      assignedModels: payload.assignedModels,
    };

    const filtered = mockModels.filter((m) => payload.assignedModels.includes(m.id));
    setAssignedModels(filtered);
    setCurrentUser(va);
    setModels(filtered);
    if (filtered.length > 0) setSelectedModelId(filtered[0].id);
    setPosts(mockPosts.filter((p) => payload.assignedModels.includes(p.modelId)));
    setVaName(payload.vaName);
    setStatus('valid');
  }, [token, setCurrentUser, setModels, setSelectedModelId, setPosts]);

  const handleModelChange = useCallback((id: string) => {
    setSelectedModelId(id);
  }, [setSelectedModelId]);

  // ── Loading ──
  if (status === 'loading') {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
          <p className="text-sm font-medium">Loading your tasks…</p>
        </div>
      </div>
    );
  }

  // ── Invalid ──
  if (status === 'invalid') {
    return (
      <div
        className="flex items-center justify-center p-6"
        style={{
          minHeight: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Link Invalid</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            This link is no longer valid. Ask your manager to send a new one.
          </p>
        </div>
      </div>
    );
  }

  // ── Valid ──
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(9,9,11,0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">CreatorFlow</p>
            <p className="text-[10px] text-zinc-500 leading-tight">{vaName}</p>
          </div>
        </div>

        {/* Model indicator (if only 1 model, show here) */}
        {assignedModels.length === 1 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-base leading-none">{assignedModels[0].profileImage}</span>
            <span className="text-xs font-semibold text-zinc-200">{assignedModels[0].name}</span>
          </div>
        )}
      </div>

      {/* ── Install banner ── */}
      <InstallBanner />

      {/* ── Model tabs (multiple models) ── */}
      <ModelTabBar
        models={assignedModels}
        selectedId={selectedModelId ?? ''}
        onChange={handleModelChange}
      />

      {/* ── Task queue ── */}
      <div className="flex-1 px-4 py-4">
        <VATaskQueue />
      </div>
    </div>
  );
}
