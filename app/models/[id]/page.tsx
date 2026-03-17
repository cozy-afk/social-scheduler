'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockVAUsers } from '@/lib/mockData';
import ModelInsights from '@/components/ModelInsights';
import { Platform, PostType, PostingFrequencyConfig, User } from '@/types/models';
import { createVAMagicLink, getVAMagicLinkURL } from '@/lib/magic-links';
import {
  ArrowLeft, Save, ToggleLeft, ToggleRight, Plus, X,
  Check, Copy, Link2, Users, Clock, ChevronUp, ChevronDown,
  Instagram, AlertCircle, BarChart2, ExternalLink,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS: { value: Platform; label: string; color: string }[] = [
  { value: 'instagram', label: 'Instagram', color: 'text-pink-400' },
  { value: 'tiktok',    label: 'TikTok',    color: 'text-red-400' },
  { value: 'threads',   label: 'Threads',   color: 'text-purple-400' },
  { value: 'x',         label: 'X (Twitter)', color: 'text-slate-300' },
];

const POST_TYPE_OPTIONS: Record<Platform, { value: PostType; label: string }[]> = {
  instagram: [
    { value: 'instagram_reel',  label: 'Reel' },
    { value: 'instagram_post',  label: 'Post / Carousel' },
    { value: 'instagram_story', label: 'Story' },
  ],
  tiktok: [
    { value: 'tiktok_reel',      label: 'Reel' },
    { value: 'tiktok_slideshow', label: 'Slideshow' },
    { value: 'tiktok_story',     label: 'Story' },
  ],
  x:       [{ value: 'x_post',       label: 'Post' }],
  threads: [{ value: 'threads_post', label: 'Post' }],
  fanvue:  [{ value: 'fanvue_post',  label: 'Post' }],
};

const PLATFORM_BG: Record<Platform, string> = {
  instagram: 'bg-pink-500/10 border-pink-500/25',
  tiktok:    'bg-red-500/10 border-red-500/25',
  threads:   'bg-purple-500/10 border-purple-500/25',
  x:         'bg-slate-700/30 border-slate-600/40',
  fanvue:    'bg-orange-500/10 border-orange-500/25',
};

// ─── PostingFrequencyCard ─────────────────────────────────────────────────────

function FrequencyCard({
  config,
  onChange,
}: {
  config: PostingFrequencyConfig;
  onChange: (updated: PostingFrequencyConfig) => void;
}) {
  const platformInfo = PLATFORM_OPTIONS.find((p) => p.value === config.platform)!;
  const [addingType, setAddingType] = useState<PostType>(
    POST_TYPE_OPTIONS[config.platform][0].value
  );

  const toggleType = (pt: PostType) => {
    const has = config.postTypes.includes(pt);
    onChange({
      ...config,
      postTypes: has
        ? config.postTypes.filter((t) => t !== pt)
        : [...config.postTypes, pt],
    });
  };

  const moveType = (idx: number, dir: -1 | 1) => {
    const arr = [...config.postTypes];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    onChange({ ...config, postTypes: arr });
  };

  return (
    <div className={`card border p-5 space-y-4 ${PLATFORM_BG[config.platform]}`}>
      {/* Platform header + enable toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-base font-bold ${platformInfo.color}`}>{platformInfo.label}</span>
          {config.enabled && (
            <span className="text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full">Active</span>
          )}
        </div>
        <button
          onClick={() => onChange({ ...config, enabled: !config.enabled })}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            config.enabled ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {config.enabled
            ? <ToggleRight className="w-6 h-6" />
            : <ToggleLeft className="w-6 h-6" />}
        </button>
      </div>

      {config.enabled && (
        <>
          {/* Posts per day */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-dark text-xs">Posts / Day</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={config.postsPerDay}
                  onChange={(e) => onChange({ ...config, postsPerDay: Number(e.target.value) })}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-white font-bold w-6 text-center">{config.postsPerDay}</span>
              </div>
            </div>

            <div>
              <label className="label-dark text-xs">Start Hour</label>
              <input
                type="number"
                min={0}
                max={23}
                value={config.startHour}
                onChange={(e) => onChange({ ...config, startHour: Number(e.target.value) })}
                className="input-dark py-2 text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">{String(config.startHour).padStart(2, '0')}:00</p>
            </div>

            <div>
              <label className="label-dark text-xs">End Hour</label>
              <input
                type="number"
                min={0}
                max={23}
                value={config.endHour}
                onChange={(e) => onChange({ ...config, endHour: Number(e.target.value) })}
                className="input-dark py-2 text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">{String(config.endHour).padStart(2, '0')}:00</p>
            </div>
          </div>

          {/* Time window summary */}
          <div className="bg-slate-800/60 rounded-lg px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span>
              {config.postsPerDay} post{config.postsPerDay > 1 ? 's' : ''} spread between{' '}
              <strong className="text-slate-200">{String(config.startHour).padStart(2, '0')}:00</strong>
              {' '}–{' '}
              <strong className="text-slate-200">{String(config.endHour).padStart(2, '0')}:00</strong>
              {config.postsPerDay > 1 && config.endHour > config.startHour && (
                <span className="text-slate-500">
                  {' '}(every ~{Math.round((config.endHour - config.startHour) * 60 / (config.postsPerDay - 1))} min)
                </span>
              )}
            </span>
          </div>

          {/* Post type cycling */}
          <div>
            <label className="label-dark text-xs mb-2">Post Type Cycling Order</label>
            <p className="text-[10px] text-slate-500 mb-2">Posts cycle through these types in order. Drag to reorder.</p>

            {config.postTypes.length > 0 ? (
              <div className="space-y-1.5 mb-3">
                {config.postTypes.map((pt, idx) => (
                  <div key={pt} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-slate-500 w-5">{idx + 1}.</span>
                    <span className="text-xs text-slate-200 flex-1 capitalize">
                      {POST_TYPE_OPTIONS[config.platform].find((o) => o.value === pt)?.label || pt}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveType(idx, -1)}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-slate-200 disabled:opacity-30 p-0.5"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveType(idx, 1)}
                        disabled={idx === config.postTypes.length - 1}
                        className="text-slate-500 hover:text-slate-200 disabled:opacity-30 p-0.5"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleType(pt)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-0.5 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mb-2">No post types selected. Add at least one.</p>
            )}

            {/* Add type */}
            <div className="flex gap-2">
              <select
                value={addingType}
                onChange={(e) => setAddingType(e.target.value as PostType)}
                className="input-dark text-sm py-1.5 flex-1"
              >
                {POST_TYPE_OPTIONS[config.platform]
                  .filter((o) => !config.postTypes.includes(o.value))
                  .map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
              </select>
              <button
                onClick={() => toggleType(addingType)}
                disabled={config.postTypes.includes(addingType)}
                className="btn-secondary flex items-center gap-1.5 text-sm px-3 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── VA Links Panel ───────────────────────────────────────────────────────────

function VALinksSection({ modelId }: { modelId: string }) {
  const { models, vaUsers, magicLinks, addMagicLink, revokeMagicLink } = useStore();
  const model = models.find((m) => m.id === modelId);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  if (!model) return null;

  const assignedVAs = vaUsers.filter((va) => model.assignedVaIds.includes(va.id));
  const getLinkForVA = (vaId: string) => magicLinks.find((l) => l.vaId === vaId && l.isActive);

  const generateLink = (va: User) => {
    const updatedVA = { ...va, assignedModels: [...new Set([...va.assignedModels, modelId])] };
    const link = createVAMagicLink(updatedVA);
    addMagicLink(link);
  };

  const copyLink = (token: string) => {
    const url = getVAMagicLinkURL(token);
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-white">VA Access Links</h3>
      </div>
      <p className="text-xs text-slate-400">
        Generate secure magic links for each VA. VAs can only access this model's task queue via their unique link.
      </p>

      {assignedVAs.length === 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-300">No VAs assigned to this model. Edit the model to assign VAs first.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignedVAs.map((va) => {
            const link = getLinkForVA(va.id);
            return (
              <div key={va.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-300 text-sm font-bold flex-shrink-0">
                  {va.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{va.name}</p>
                  {link ? (
                    <p className="text-xs text-slate-500 truncate">
                      Expires {new Date(link.expiresAt).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">No active link</p>
                  )}
                </div>
                {link ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyLink(link.token)}
                      className="flex items-center gap-1.5 text-xs bg-blue-600/20 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition-colors"
                    >
                      {copiedToken === link.token
                        ? <><Check className="w-3 h-3" />Copied!</>
                        : <><Copy className="w-3 h-3" />Copy Link</>}
                    </button>
                    <button
                      onClick={() => revokeMagicLink(link.token)}
                      className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      title="Revoke link"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => generateLink(va)}
                    className="flex items-center gap-1.5 text-xs bg-slate-700 border border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-600 transition-colors flex-shrink-0"
                  >
                    <Link2 className="w-3 h-3" />
                    Generate Link
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModelSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = typeof params.id === 'string' ? params.id : '';

  const { models, setModels, setSelectedModelId, setCurrentUser, setVAUsers, updateModel, magicLinks, setMagicLinks } = useStore();

  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'frequency' | 'va' | 'insights' | 'fanvue'>('frequency');

  // Frequency state (local copy for editing)
  const [frequency, setFrequency] = useState<PostingFrequencyConfig[]>([]);

  // Meta connection state
  const [metaAccountId, setMetaAccountId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');

  // Fanvue connection state
  const [fanvueHandle, setFanvueHandle] = useState('');
  const [fanvueToken, setFanvueToken] = useState('');

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setVAUsers(mockVAUsers);
    setMagicLinks([]);
  }, [setModels, setSelectedModelId, setCurrentUser, setVAUsers, setMagicLinks]);

  const model = models.find((m) => m.id === modelId);

  useEffect(() => {
    if (model?.postingFrequency) {
      setFrequency(model.postingFrequency);
    }
    if (model?.metaConnection) {
      setMetaAccountId(model.metaConnection.instagramAccountId || '');
      setMetaAccessToken(model.metaConnection.accessToken || '');
    }
    if (model?.fanvueAccountId) {
      setFanvueHandle(model.fanvueAccountId);
    }
    if (model?.fanvueConnection?.accessToken) {
      setFanvueToken(model.fanvueConnection.accessToken);
    }
  }, [model]);

  // Handle Fanvue OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handle = params.get('fanvue_handle');
    const token = params.get('fanvue_token');
    if (handle && token) {
      setFanvueHandle(handle);
      setFanvueToken(token);
      updateModel(modelId, {
        fanvueAccountId: handle,
        fanvueConnection: { accessToken: token, connectedAt: new Date().toISOString() },
      });
      // Clean up URL
      window.history.replaceState({}, '', `/models/${modelId}`);
    }
  }, [modelId, updateModel]);

  const handleSave = () => {
    updateModel(modelId, {
      postingFrequency: frequency,
      metaConnection: {
        instagramAccountId: metaAccountId || undefined,
        accessToken: metaAccessToken || undefined,
        connectedAt: metaAccountId ? (model?.metaConnection?.connectedAt || new Date().toISOString()) : undefined,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateFrequency = (platform: Platform, updated: PostingFrequencyConfig) => {
    setFrequency((prev) => prev.map((c) => (c.platform === platform ? updated : c)));
  };

  if (!model) {
    return (
      <div className="min-h-screen">
        <main className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-slate-400">Model not found.</p>
          <button onClick={() => router.push('/models')} className="btn-secondary mt-4 text-sm">
            Back to Models
          </button>
        </main>
      </div>
    );
  }

  const enabledPlatforms = frequency.filter((c) => c.enabled);
  const totalPostsPerDay = enabledPlatforms.reduce((s, c) => s + c.postsPerDay, 0);

  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/models')}
            className="btn-ghost p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
              {model.profileImage || '👤'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{model.name}</h2>
              <p className="text-xs text-slate-400">Model Settings</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
              saved
                ? 'bg-green-600 text-white'
                : 'btn-primary'
            }`}
          >
            {saved ? <><Check className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save Changes</>}
          </button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{totalPostsPerDay}</p>
            <p className="text-xs text-slate-500 mt-0.5">Posts / Day</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{enabledPlatforms.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Platforms Active</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{totalPostsPerDay * 7}</p>
            <p className="text-xs text-slate-500 mt-0.5">Posts / Week</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700/60">
          {([
            { id: 'frequency', label: 'Posting Frequency', icon: <Clock className="w-4 h-4" /> },
            { id: 'va',        label: 'VA Links',          icon: <Users className="w-4 h-4" /> },
            { id: 'insights',  label: 'Insights',          icon: <BarChart2 className="w-4 h-4" /> },
            { id: 'fanvue',    label: 'Fanvue',            icon: <ExternalLink className="w-4 h-4" /> },
          ] as const).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                tab === id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Frequency tab */}
        {tab === 'frequency' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Configure how many times per day to post on each platform, what hours to spread them across, and which content types to cycle through.
            </p>
            {frequency.map((config) => (
              <FrequencyCard
                key={config.platform}
                config={config}
                onChange={(updated) => updateFrequency(config.platform, updated)}
              />
            ))}
          </div>
        )}

        {/* VA Links tab */}
        {tab === 'va' && <VALinksSection modelId={modelId} />}

        {/* Fanvue tab */}
        {tab === 'fanvue' && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold">F</div>
              <h3 className="font-semibold text-white">Fanvue Connection</h3>
              {fanvueHandle && (
                <span className="text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full">
                  Connected
                </span>
              )}
            </div>

            {fanvueHandle ? (
              <div className="space-y-3">
                <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    <span className="text-orange-400 font-bold">F</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">@{fanvueHandle}</p>
                    <p className="text-xs text-slate-500">Fanvue Creator Account</p>
                  </div>
                  <button
                    onClick={() => {
                      setFanvueHandle('');
                      setFanvueToken('');
                      updateModel(modelId, { fanvueConnection: { accessToken: '', connectedAt: undefined } });
                    }}
                    className="ml-auto text-xs text-red-400 hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
                <p className="text-xs text-slate-400">Posts tagged as &quot;Fanvue&quot; will be published to this account.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Connect your Fanvue creator account to schedule and publish posts directly from the calendar.
                </p>

                {/* Manual handle input */}
                <div>
                  <label className="label-dark text-xs">Fanvue Creator Handle</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={fanvueHandle}
                      onChange={(e) => setFanvueHandle(e.target.value)}
                      placeholder="your-fanvue-username"
                      className="input-dark flex-1"
                    />
                    <button
                      onClick={() => {
                        if (fanvueHandle.trim()) {
                          updateModel(modelId, { fanvueAccountId: fanvueHandle.trim() });
                          setSaved(true);
                          setTimeout(() => setSaved(false), 2500);
                        }
                      }}
                      className="btn-primary text-sm px-3"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Your Fanvue username/handle for this model&apos;s account.</p>
                </div>

                {/* OAuth connect button */}
                <div className="border-t border-slate-700 pt-3">
                  <a
                    href={`https://auth.fanvue.com/connect/authorize?client_id=${process.env.NEXT_PUBLIC_FANVUE_CLIENT_ID || ''}&response_type=code&redirect_uri=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/api/oauth/fanvue/callback' : '')}&scope=read:self%20write:posts&state=${modelId}`}
                    className="btn-secondary text-sm flex items-center gap-2 w-fit"
                  >
                    <div className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">F</div>
                    Connect with Fanvue OAuth
                  </a>
                  <p className="text-[10px] text-slate-500 mt-1">Requires FANVUE_CLIENT_ID to be configured in .env.local</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Insights tab — per-model Instagram credentials */}
        {tab === 'insights' && (
          <div className="space-y-3">
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <h3 className="text-sm font-semibold text-white">Instagram API Credentials</h3>
                  {metaAccountId && metaAccessToken && (
                    <span className="text-xs bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full">
                      Connected
                    </span>
                  )}
                </div>
                <button onClick={handleSave} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Each model needs its own Instagram Business Account credentials. These are stored per-model and used for insights and hashtag research.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="label-dark text-xs">Instagram Business Account ID</label>
                  <input
                    type="text"
                    value={metaAccountId}
                    onChange={(e) => setMetaAccountId(e.target.value)}
                    placeholder="17841400008460056"
                    className="input-dark"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Find in Meta Business Suite → Settings → Account Info
                  </p>
                </div>

                <div>
                  <label className="label-dark text-xs">Access Token</label>
                  <input
                    type="password"
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                    placeholder="EAAxxxxxxxx..."
                    className="input-dark font-mono text-xs"
                    autoComplete="off"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Generate a long-lived page access token in Meta Developer Console. Required for Insights and Research features.
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-300">
                <strong>Tip:</strong> To get your Access Token: Meta for Developers → Your App → Tools → Graph API Explorer → Generate Token with <code className="bg-slate-800 px-1 rounded">instagram_basic, instagram_manage_insights, pages_read_engagement</code> permissions.
              </div>
            </div>

            <ModelInsights accountId={metaAccountId} accessToken={metaAccessToken} />
          </div>
        )}
      </main>
    </div>
  );
}
