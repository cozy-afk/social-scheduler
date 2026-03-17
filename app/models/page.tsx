'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockVAUsers, mockPosts, mockCaptions } from '@/lib/mockData';
import { Model, User, TimeSlot, Platform, PostType, PostingFrequencyConfig } from '@/types/models';
import { createVAMagicLink, getVAMagicLinkURL } from '@/lib/magic-links';
import {
  Plus, Edit2, Trash2, Users, Link2, Check, X,
  Clock, Copy, Zap, ToggleLeft, ToggleRight, Settings,
} from 'lucide-react';
import Link from 'next/link';

// ─── Add / Edit Model Modal ──────────────────────────────────────────────────

const PROFILE_EMOJIS = ['👩','👱‍♀️','🧑‍🦱','👩‍🦰','👩‍🦳','👩‍🦲','🧕','👸','💃','🌸','⭐','💎'];

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'x',         label: 'X (Twitter)' },
  { value: 'threads',   label: 'Threads' },
];

const POST_TYPE_OPTIONS: Record<Platform, { value: PostType; label: string }[]> = {
  instagram: [
    { value: 'instagram_post',  label: 'Post (Carousel)' },
    { value: 'instagram_reel',  label: 'Reel' },
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

function ModelFormModal({
  model,
  vaUsers,
  onSave,
  onClose,
}: {
  model?: Model;
  vaUsers: User[];
  onSave: (data: Partial<Model> & { name: string }) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'general' | 'schedule' | 'vas'>('general');
  const [name, setName] = useState(model?.name || '');
  const [emoji, setEmoji] = useState(model?.profileImage || '👩');
  const [status, setStatus] = useState<'active' | 'paused'>(model?.status || 'active');
  const [schedule, setSchedule] = useState<TimeSlot[]>(model?.postingSchedule || []);
  const [assignedVaIds, setAssignedVaIds] = useState<string[]>(model?.assignedVaIds || []);

  // New slot form
  const [slotTime, setSlotTime] = useState('09:00');
  const [slotPlatform, setSlotPlatform] = useState<Platform>('instagram');
  const [slotPostType, setSlotPostType] = useState<PostType>('instagram_reel');
  const [slotRecurrence, setSlotRecurrence] = useState<TimeSlot['recurrence']>('daily');

  const addSlot = () => {
    setSchedule((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}`,
        time: slotTime,
        platform: slotPlatform,
        postType: slotPostType,
        recurrence: slotRecurrence,
      },
    ]);
  };

  const removeSlot = (id: string) => setSchedule((prev) => prev.filter((s) => s.id !== id));

  const toggleVA = (vaId: string) => {
    setAssignedVaIds((prev) =>
      prev.includes(vaId) ? prev.filter((id) => id !== vaId) : [...prev, vaId]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({ name, profileImage: emoji, status, postingSchedule: schedule, assignedVaIds });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-5 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white">{model ? 'Edit Model' : 'Add Model'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {(['general', 'schedule', 'vas'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'vas' ? 'VA Access' : t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'general' && (
            <div className="space-y-4">
              {/* Emoji picker */}
              <div>
                <label className="label-dark">Profile Image</label>
                <div className="flex flex-wrap gap-2">
                  {PROFILE_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`text-2xl p-2 rounded-lg border transition-all ${
                        emoji === e
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-dark">Model Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-dark"
                  placeholder="e.g. Emma Rose"
                />
              </div>

              <div>
                <label className="label-dark">Status</label>
                <button
                  onClick={() => setStatus((s) => s === 'active' ? 'paused' : 'active')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                    status === 'active'
                      ? 'bg-green-500/15 border-green-500/40 text-green-300'
                      : 'bg-slate-800 border-slate-600 text-slate-400'
                  }`}
                >
                  {status === 'active'
                    ? <><ToggleRight className="w-5 h-5" /> Active</>
                    : <><ToggleLeft className="w-5 h-5" /> Paused</>
                  }
                </button>
              </div>
            </div>
          )}

          {tab === 'schedule' && (
            <div className="space-y-4">
              {/* Existing slots */}
              {schedule.length > 0 ? (
                <div className="space-y-2">
                  {schedule.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2 card-surface px-3 py-2 rounded-lg">
                      <span className="font-mono text-sm text-slate-300 w-14">{slot.time}</span>
                      <span className="text-xs text-slate-400 capitalize flex-1">{slot.platform} · {slot.postType.replace(`${slot.platform}_`, '')}</span>
                      <span className="text-xs text-slate-500 capitalize">{slot.recurrence}</span>
                      <button onClick={() => removeSlot(slot.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No time slots configured. Add one below.</p>
              )}

              {/* Add slot form */}
              <div className="card-surface rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add Time Slot</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label-dark text-xs">Time</label>
                    <input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} className="input-dark py-2 text-sm" />
                  </div>
                  <div>
                    <label className="label-dark text-xs">Platform</label>
                    <select
                      value={slotPlatform}
                      onChange={(e) => {
                        const p = e.target.value as Platform;
                        setSlotPlatform(p);
                        setSlotPostType(POST_TYPE_OPTIONS[p][0].value);
                      }}
                      className="input-dark py-2 text-sm"
                    >
                      {PLATFORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-dark text-xs">Post Type</label>
                    <select
                      value={slotPostType}
                      onChange={(e) => setSlotPostType(e.target.value as PostType)}
                      className="input-dark py-2 text-sm"
                    >
                      {POST_TYPE_OPTIONS[slotPlatform].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-dark text-xs">Recurrence</label>
                    <select value={slotRecurrence} onChange={(e) => setSlotRecurrence(e.target.value as TimeSlot['recurrence'])} className="input-dark py-2 text-sm">
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekends">Weekends</option>
                    </select>
                  </div>
                </div>
                <button onClick={addSlot} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Add Slot
                </button>
              </div>
            </div>
          )}

          {tab === 'vas' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Select which VAs can access this model&apos;s task queue.</p>
              {vaUsers.length === 0 ? (
                <div className="card py-8 text-center text-slate-500 text-sm">No VA users configured</div>
              ) : (
                vaUsers.map((va) => {
                  const assigned = assignedVaIds.includes(va.id);
                  return (
                    <div key={va.id} className={`flex items-center gap-3 card-surface px-4 py-3 rounded-xl border ${assigned ? 'border-blue-500/30' : 'border-transparent'}`}>
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-300 text-sm font-bold">
                        {va.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">{va.name}</p>
                        <p className="text-xs text-slate-500">{va.email}</p>
                      </div>
                      <button
                        onClick={() => toggleVA(va.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          assigned
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {assigned ? <><Check className="w-3.5 h-3.5" />Assigned</> : 'Assign'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSubmit} className="btn-primary flex-1">
              {model ? 'Save Changes' : 'Create Model'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VA Link Panel ────────────────────────────────────────────────────────────
function VALinkPanel({ model, vaUsers }: { model: Model; vaUsers: User[] }) {
  const { magicLinks, addMagicLink, revokeMagicLink } = useStore();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const assignedVAs = vaUsers.filter((va) => model.assignedVaIds.includes(va.id));

  const getLinkForVA = (vaId: string) =>
    magicLinks.find((l) => l.vaId === vaId && l.isActive);

  const generateLink = (va: User) => {
    // Give this VA access to this model (and any they already have)
    const updatedVA = { ...va, assignedModels: [...new Set([...va.assignedModels, model.id])] };
    const link = createVAMagicLink(updatedVA);
    addMagicLink(link);
  };

  const copyLink = (token: string) => {
    const url = getVAMagicLinkURL(token);
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (assignedVAs.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-2">
        No VAs assigned. Edit model to assign VAs.
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      {assignedVAs.map((va) => {
        const link = getLinkForVA(va.id);
        return (
          <div key={va.id} className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
            <span className="text-xs text-slate-300 flex-1 min-w-0 truncate">{va.name}</span>
            {link ? (
              <>
                <button
                  onClick={() => copyLink(link.token)}
                  className="flex items-center gap-1 text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-600/30 transition-colors"
                >
                  {copiedToken === link.token
                    ? <><Check className="w-3 h-3" />Copied!</>
                    : <><Copy className="w-3 h-3" />Copy Link</>
                  }
                </button>
                <button
                  onClick={() => revokeMagicLink(link.token)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                  title="Revoke link"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => generateLink(va)}
                className="flex items-center gap-1 text-xs bg-slate-700 border border-slate-600 text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <Link2 className="w-3 h-3" />
                Generate Link
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Model Card ───────────────────────────────────────────────────────────────
function ModelCard({
  model,
  vaUsers,
  onEdit,
  onDelete,
}: {
  model: Model;
  vaUsers: User[];
  onEdit: (model: Model) => void;
  onDelete: (id: string) => void;
}) {
  const [showLinks, setShowLinks] = useState(false);
  const platforms = [...new Set(model.postingSchedule.map((s) => s.platform))];
  const assignedVAs = vaUsers.filter((va) => model.assignedVaIds.includes(va.id));

  const PLATFORM_COLORS: Record<string, string> = {
    instagram: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    tiktok:    'bg-red-500/20 text-red-300 border-red-500/30',
    x:         'bg-slate-500/20 text-slate-300 border-slate-500/30',
    threads:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
            {model.profileImage || '👤'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-base">{model.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              model.status === 'active'
                ? 'bg-green-500/15 border-green-500/30 text-green-400'
                : 'bg-slate-700 border-slate-600 text-slate-400'
            }`}>
              {model.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={`/models/${model.id}`} className="btn-ghost p-2" title="Model settings">
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onEdit(model)}
            className="btn-ghost p-2"
            title="Edit model"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(model.id)}
            className="btn-ghost p-2 hover:text-red-400"
            title="Delete model"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Schedule summary */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{model.postingSchedule.length} daily posting slots</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((p) => (
            <span key={p} className={`platform-chip border capitalize ${PLATFORM_COLORS[p] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Assigned VAs */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5" />
            <span>{assignedVAs.length > 0 ? `${assignedVAs.length} VA${assignedVAs.length > 1 ? 's' : ''} assigned` : 'No VAs assigned'}</span>
          </div>
          {assignedVAs.length > 0 && (
            <button
              onClick={() => setShowLinks(!showLinks)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Link2 className="w-3 h-3" />
              {showLinks ? 'Hide Links' : 'Manage Links'}
            </button>
          )}
        </div>
        {assignedVAs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {assignedVAs.map((va) => (
              <span key={va.id} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                {va.name}
              </span>
            ))}
          </div>
        )}
        {showLinks && <VALinkPanel model={model} vaUsers={vaUsers} />}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ModelsPage() {
  const {
    models, setModels, setSelectedModelId, setCurrentUser, setPosts, setCaptions,
    vaUsers, setVAUsers,
    addModel, updateModel, deleteModel,
    setMagicLinks,
  } = useStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setPosts(mockPosts);
    setCaptions(mockCaptions);
    setVAUsers(mockVAUsers);
    setMagicLinks([]);
  }, [setModels, setSelectedModelId, setCurrentUser, setPosts, setCaptions, setVAUsers, setMagicLinks]);

  const handleSaveModel = (data: Partial<Model> & { name: string }) => {
    if (editingModel) {
      updateModel(editingModel.id, data);
    } else {
      addModel({
        id: `model-${Date.now()}`,
        name: data.name,
        profileImage: data.profileImage || '👤',
        agencyId: data.agencyId || '',
        fanvueAccountId: data.fanvueAccountId || '',
        s3Folder: data.s3Folder || '',
        exifPreset: {
          device: 'iPhone 16 Pro', model: 'iPhone17,1',
          lens: 'iPhone 16 Pro back triple camera 6.86mm f/1.78', software: 'iOS 18.2.1',
          gpsLatitude: 34.0522, gpsLongitude: -118.2437,
          isoVariance: [100, 200, 400, 800], focalLengthVariance: [6.86, 9.0, 24.0],
        },
        postingSchedule: data.postingSchedule || [],
        postingFrequency: data.postingFrequency || [
          { platform: 'instagram', enabled: true,  postsPerDay: 3, startHour: 8,  endHour: 21, postTypes: ['instagram_reel', 'instagram_post'] },
          { platform: 'tiktok',    enabled: true,  postsPerDay: 3, startHour: 9,  endHour: 21, postTypes: ['tiktok_reel', 'tiktok_slideshow'] },
          { platform: 'threads',   enabled: true,  postsPerDay: 1, startHour: 10, endHour: 18, postTypes: ['threads_post'] },
          { platform: 'x',         enabled: false, postsPerDay: 1, startHour: 9,  endHour: 17, postTypes: ['x_post'] },
        ] as PostingFrequencyConfig[],
        assignedVaIds: data.assignedVaIds || [],
        status: data.status || 'active',
        createdAt: new Date().toISOString(),
      });
    }
    setEditingModel(null);
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deleteModel(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Models</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {models.length} model{models.length !== 1 ? 's' : ''} · manage schedules, VA access & magic links
            </p>
          </div>
          <button
            onClick={() => { setEditingModel(null); setShowAddModal(true); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Model
          </button>
        </div>

        {/* VA Users quick info */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Users className="w-4 h-4 text-blue-400" />
              VA Users ({vaUsers.length})
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {vaUsers.map((va) => (
              <div key={va.id} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                <div className="w-5 h-5 bg-blue-500/30 rounded-full flex items-center justify-center text-xs font-bold text-blue-300">
                  {va.name.charAt(0)}
                </div>
                <span className="text-xs text-slate-200">{va.name}</span>
                <span className="text-xs text-slate-500">
                  {va.assignedModels.length} model{va.assignedModels.length !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Models grid */}
        {models.length === 0 ? (
          <div className="card py-16 text-center">
            <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No models yet. Add your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <div key={model.id} className="relative">
                {confirmDelete === model.id && (
                  <div className="absolute inset-0 z-10 bg-slate-900/90 rounded-xl flex flex-col items-center justify-center gap-3">
                    <p className="text-sm font-medium text-white">Delete {model.name}?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(null)} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
                      <button onClick={() => handleDelete(model.id)} className="bg-red-600 hover:bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
                <ModelCard
                  model={model}
                  vaUsers={vaUsers}
                  onEdit={(m) => { setEditingModel(m); setShowAddModal(true); }}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showAddModal && (
        <ModelFormModal
          model={editingModel || undefined}
          vaUsers={vaUsers}
          onSave={handleSaveModel}
          onClose={() => { setShowAddModal(false); setEditingModel(null); }}
        />
      )}
    </div>
  );
}
