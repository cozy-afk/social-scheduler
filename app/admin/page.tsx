'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { Agency } from '@/types/models';
import {
  Lock,
  Building2,
  Cpu,
  Activity,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  Clock,
  BarChart2,
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { InstagramIcon, TikTokIcon, XIcon, ThreadsIcon, FanvueIcon } from '@/components/PlatformIcons';

// ─── Local Types ──────────────────────────────────────────────────────────────

/** UI-layer extension: adds optional email to the domain Agency type */
interface AgencyWithEmail extends Agency {
  email?: string;
}

type TabId = 'agencies' | 'ai' | 'status' | 'posted';

type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'grok';

interface AiProviderConfig {
  id: AiProvider;
  label: string;
  icon: string;
  iconColor: string;
  models: string[];
}

interface SystemStatus {
  r2: { configured: boolean; bucket: string | null };
  meta: { configured: boolean; appId: string | null };
  ai: { provider: string; configured: boolean };
  auth: { configured: boolean };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AI_PROVIDERS: AiProviderConfig[] = [
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    icon: '🤖',
    iconColor: 'text-orange-400',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  },
  {
    id: 'openai',
    label: 'OpenAI GPT',
    icon: '⚡',
    iconColor: 'text-green-400',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    icon: '✨',
    iconColor: 'text-blue-400',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'],
  },
  {
    id: 'grok',
    label: 'xAI Grok',
    icon: '🌐',
    iconColor: 'text-purple-400',
    models: ['grok-3', 'grok-3-mini', 'grok-2-vision-1212'],
  },
];

const MOCK_AGENCIES: AgencyWithEmail[] = [
  {
    id: 'agency-1',
    name: 'Apex Media Group',
    email: 'contact@apexmedia.io',
    featureAccess: { captions: true, analytics: true },
    createdAt: '2025-11-01T09:00:00Z',
  },
  {
    id: 'agency-2',
    name: 'Stellar Content Co.',
    email: 'hello@stellarcontent.com',
    featureAccess: { captions: true, analytics: false },
    createdAt: '2025-12-15T14:30:00Z',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
      <Check className="w-3 h-3" />
      Configured
    </span>
  ) : (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
      Not set
    </span>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-violet-600' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

// ─── Agency Modal ─────────────────────────────────────────────────────────────

interface AgencyModalProps {
  agency: AgencyWithEmail | null;
  onClose: () => void;
  onSave: (agency: AgencyWithEmail) => void;
}

function AgencyModal({ agency, onClose, onSave }: AgencyModalProps) {
  const [name, setName] = useState(agency?.name ?? '');
  const [email, setEmail] = useState(agency?.email ?? '');
  const [captions, setCaptions] = useState(agency?.featureAccess.captions ?? true);
  const [analytics, setAnalytics] = useState(agency?.featureAccess.analytics ?? false);

  const isEditing = agency !== null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: agency?.id ?? `agency-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || undefined,
      featureAccess: { captions, analytics },
      createdAt: agency?.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 space-y-5 mx-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            {isEditing ? 'Edit Agency' : 'Add Agency'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-dark">Agency Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark"
              placeholder="Apex Media Group"
            />
          </div>
          <div>
            <label className="label-dark">Contact Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark"
              placeholder="contact@agency.com"
            />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Feature Access
            </p>
            <ToggleSwitch checked={captions} onChange={setCaptions} label="Caption Library" />
            <ToggleSwitch checked={analytics} onChange={setAnalytics} label="Analytics Dashboard" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Save Changes' : 'Add Agency'}
          </button>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Agencies Tab ─────────────────────────────────────────────────────────────

function AgenciesTab() {
  const { agencies: storeAgencies, addAgency, updateAgency, deleteAgency } = useStore();

  // Seed mock data into the store on first render if empty
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && storeAgencies.length === 0) {
      MOCK_AGENCIES.forEach((a) => {
        const { email: _email, ...agencyBase } = a;
        addAgency(agencyBase);
      });
      setSeeded(true);
    } else {
      setSeeded(true);
    }
  }, [seeded, storeAgencies.length, addAgency]);

  // Keep local email state separate (not in the domain type)
  const [emailMap, setEmailMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    MOCK_AGENCIES.forEach((a) => {
      if (a.email) map[a.id] = a.email;
    });
    return map;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AgencyWithEmail | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { models } = useStore();

  const modelCountForAgency = (agencyId: string) =>
    models.filter((m) => m.agencyId === agencyId).length;

  const openAdd = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (agency: Agency) => {
    setEditTarget({ ...agency, email: emailMap[agency.id] });
    setModalOpen(true);
  };

  const handleSave = (agency: AgencyWithEmail) => {
    const { email, ...agencyBase } = agency;
    if (editTarget) {
      updateAgency(agency.id, agencyBase);
    } else {
      addAgency(agencyBase);
    }
    if (email) {
      setEmailMap((prev) => ({ ...prev, [agency.id]: email }));
    }
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleDelete = (id: string) => {
    deleteAgency(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{storeAgencies.length} agencies registered</p>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Add Agency
        </button>
      </div>

      {storeAgencies.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          No agencies yet. Add the first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {storeAgencies.map((agency) => (
            <div key={agency.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-violet-400 shrink-0" />
                    <span className="font-medium text-white truncate">{agency.name}</span>
                  </div>
                  {emailMap[agency.id] && (
                    <p className="text-xs text-slate-400 pl-6">{emailMap[agency.id]}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 pl-6 pt-1">
                    <span className="text-xs text-slate-500">
                      {modelCountForAgency(agency.id)} model
                      {modelCountForAgency(agency.id) !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span
                      className={`text-xs ${
                        agency.featureAccess.captions ? 'text-green-400' : 'text-slate-600'
                      }`}
                    >
                      Captions {agency.featureAccess.captions ? 'on' : 'off'}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span
                      className={`text-xs ${
                        agency.featureAccess.analytics ? 'text-green-400' : 'text-slate-600'
                      }`}
                    >
                      Analytics {agency.featureAccess.analytics ? 'on' : 'off'}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">
                      Created {new Date(agency.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(agency)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    aria-label={`Edit ${agency.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {confirmDeleteId === agency.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(agency.id)}
                        className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(agency.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      aria-label={`Delete ${agency.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <AgencyModal
          agency={editTarget}
          onClose={() => {
            setModalOpen(false);
            setEditTarget(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─── AI Config Tab ────────────────────────────────────────────────────────────

function AiConfigTab() {
  const [activeProvider, setActiveProvider] = useState<AiProvider>('anthropic');
  const [selectedModels, setSelectedModels] = useState<Record<AiProvider, string>>({
    anthropic: 'claude-sonnet-4-6',
    openai: 'gpt-4o',
    gemini: 'gemini-2.0-flash',
    grok: 'grok-3',
  });
  const [apiKeys, setApiKeys] = useState<Record<AiProvider, string>>({
    anthropic: '',
    openai: '',
    gemini: '',
    grok: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'idle' | 'success' | 'error'>('idle');

  const setModel = (provider: AiProvider, model: string) =>
    setSelectedModels((prev) => ({ ...prev, [provider]: model }));

  const setApiKey = (provider: AiProvider, key: string) =>
    setApiKeys((prev) => ({ ...prev, [provider]: key }));

  const handleSave = async () => {
    setSaving(true);
    setSaveResult('idle');
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          model: selectedModels[activeProvider],
          apiKey: apiKeys[activeProvider],
        }),
      });
      setSaveResult(res.ok ? 'success' : 'error');
    } catch {
      setSaveResult('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveResult('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {AI_PROVIDERS.map((provider) => {
          const isActive = activeProvider === provider.id;
          const hasKey = apiKeys[provider.id].trim().length > 0;

          return (
            <div
              key={provider.id}
              className={`card p-5 space-y-4 transition-colors ${
                isActive ? 'ring-2 ring-violet-500/60' : ''
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xl ${provider.iconColor}`}>{provider.icon}</span>
                  <span className="font-medium text-white text-sm">{provider.label}</span>
                </div>
                <StatusBadge configured={hasKey} />
              </div>

              {/* Model selector */}
              <div>
                <label className="label-dark">Model</label>
                <div className="relative">
                  <select
                    value={selectedModels[provider.id]}
                    onChange={(e) => setModel(provider.id, e.target.value)}
                    className="input-dark appearance-none pr-8"
                  >
                    {provider.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* API key input */}
              <div>
                <label className="label-dark">API Key</label>
                <input
                  type="password"
                  value={apiKeys[provider.id]}
                  onChange={(e) => setApiKey(provider.id, e.target.value)}
                  className="input-dark"
                  placeholder="sk-..."
                  autoComplete="new-password"
                />
              </div>

              {/* Active radio */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="activeProvider"
                  checked={isActive}
                  onChange={() => setActiveProvider(provider.id)}
                  className="accent-violet-500 w-4 h-4"
                />
                <span className="text-sm text-slate-300">Use as active provider</span>
              </label>
            </div>
          );
        })}
      </div>

      {/* Save button + disclaimer */}
      <div className="space-y-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`btn-primary flex items-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed ${
            saveResult === 'success' ? 'bg-green-600 hover:bg-green-600' : ''
          } ${saveResult === 'error' ? 'bg-red-600 hover:bg-red-600' : ''}`}
        >
          {saving && (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          )}
          {saveResult === 'success' && <Check className="w-4 h-4" />}
          {saveResult === 'success'
            ? 'Saved'
            : saveResult === 'error'
            ? 'Error — try again'
            : 'Save AI Config'}
        </button>
        <p className="text-xs text-slate-500 flex items-start gap-1.5">
          <Lock className="w-3 h-3 mt-0.5 shrink-0" />
          API keys are stored server-side only and never exposed to the browser.
        </p>
      </div>
    </div>
  );
}

// ─── System Status Tab ────────────────────────────────────────────────────────

interface StatusCardProps {
  label: string;
  detail?: string | null;
  configured: boolean;
}

function StatusCard({ label, detail, configured }: StatusCardProps) {
  return (
    <div className="card p-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
      <StatusBadge configured={configured} />
    </div>
  );
}

function SystemStatusTab() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/config');
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      setStatus(json.data as SystemStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
        <span className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-slate-300 animate-spin" />
        Loading system status…
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="card p-6 text-center space-y-3">
        <p className="text-sm text-red-400">{error ?? 'Unknown error'}</p>
        <button
          onClick={fetchStatus}
          className="text-sm text-violet-400 hover:text-violet-300 underline underline-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StatusCard
        label="R2 Storage"
        detail={status.r2.bucket ? `Bucket: ${status.r2.bucket}` : undefined}
        configured={status.r2.configured}
      />
      <StatusCard
        label="Meta API"
        detail={status.meta.appId ? `App ID: ${status.meta.appId}` : undefined}
        configured={status.meta.configured}
      />
      <StatusCard
        label="AI Provider"
        detail={`Provider: ${status.ai.provider}`}
        configured={status.ai.configured}
      />
      <StatusCard label="Auth (Discord)" configured={status.auth.configured} />
    </div>
  );
}

// ─── Posted Today Tab ─────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', threads: 'Threads', x: 'X', fanvue: 'Fanvue',
};
const POST_TYPE_LABEL: Record<string, string> = {
  instagram_post: 'Post', instagram_reel: 'Reel', instagram_story: 'Story',
  tiktok_reel: 'Reel', tiktok_slideshow: 'Slideshow', tiktok_story: 'Story',
  x_post: 'Post', threads_post: 'Post', fanvue_post: 'Post',
};

function PostedTodayTab() {
  const { posts, models } = useStore();

  const todayCompleted = posts.filter(
    (p) => p.status === 'completed' && p.completedAt && isToday(parseISO(p.completedAt))
  ).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  // Group by model
  const byModel = models.map((m) => ({
    model: m,
    posts: todayCompleted.filter((p) => p.modelId === m.id),
  })).filter((g) => g.posts.length > 0);

  const missingUrl = todayCompleted.filter((p) => !p.postedUrl).length;

  if (todayCompleted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <Clock className="w-12 h-12 text-slate-700" />
        <p className="text-white font-semibold">No posts completed today yet</p>
        <p className="text-sm text-slate-500">Completed posts will appear here with verification links.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-green-300">{todayCompleted.length} posted today</span>
        </div>
        {missingUrl > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">{missingUrl} missing URL</span>
          </div>
        )}
      </div>

      {/* Per-model groups */}
      {byModel.map(({ model, posts: modelPosts }) => (
        <div key={model.id} className="card overflow-hidden">
          {/* Model header */}
          <div className="flex items-center gap-3 px-5 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
            {model.profileImage ? (
              <img src={model.profileImage} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-violet-600/30 flex items-center justify-center text-xs font-bold text-violet-300">
                {model.name.charAt(0)}
              </div>
            )}
            <span className="text-sm font-semibold text-white">{model.name}</span>
            <span className="ml-auto text-xs text-slate-500">{modelPosts.length} post{modelPosts.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Post rows */}
          <div className="divide-y divide-white/[0.04]">
            {modelPosts.map((post) => (
              <div key={post.id} className="flex items-center gap-3 px-5 py-3">
                {/* Platform dot */}
                <span className="text-base flex-shrink-0">
                  {post.platform === 'instagram' && <InstagramIcon size={18} />}
                  {post.platform === 'tiktok' && <TikTokIcon size={18} />}
                  {post.platform === 'x' && <XIcon size={18} />}
                  {post.platform === 'threads' && <ThreadsIcon size={18} />}
                  {post.platform === 'fanvue' && <FanvueIcon size={18} />}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {PLATFORM_LABEL[post.platform]} {POST_TYPE_LABEL[post.postType]}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Scheduled {format(parseISO(post.scheduledTime), 'h:mm a')}
                    {post.completedAt && (
                      <> · Posted {format(parseISO(post.completedAt), 'h:mm a')}</>
                    )}
                    {post.completedBy && (
                      <> · by {post.completedBy}</>
                    )}
                  </p>
                </div>

                {/* Verification link */}
                {post.postedUrl ? (
                  <a
                    href={post.postedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
                  >
                    Verify <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-amber-500/70 flex-shrink-0">No URL</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'agencies', label: 'Agencies', icon: <Building2 className="w-4 h-4" /> },
  { id: 'ai', label: 'AI Config', icon: <Cpu className="w-4 h-4" /> },
  { id: 'status', label: 'System Status', icon: <Activity className="w-4 h-4" /> },
  { id: 'posted', label: 'Posted Today', icon: <CheckCircle2 className="w-4 h-4" /> },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('agencies');

  return (
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Page header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-sm text-slate-400">
            Accessible only via direct URL — not linked from navigation.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-slate-800 pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-white border-violet-500 bg-slate-900/60'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'agencies' && <AgenciesTab />}
          {activeTab === 'ai' && <AiConfigTab />}
          {activeTab === 'status' && <SystemStatusTab />}
          {activeTab === 'posted' && <PostedTodayTab />}
        </div>
      </main>
    </div>
  );
}
