'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockVAUsers, mockCaptions } from '@/lib/mockData';
import { createVAMagicLink, getVAMagicLinkURL } from '@/lib/magic-links';
import { Model, User, TimeSlot, Platform, PostType, PostingFrequencyConfig, DailyPostingTarget } from '@/types/models';
import {
  Boxes, Users, Shield,
  Check, X, Plus, Edit2, Trash2,
  Copy, Link2, Settings, Zap,
  ToggleLeft, ToggleRight, RefreshCw,
  AlertTriangle, Info,
} from 'lucide-react';
import Link from 'next/link';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFILE_EMOJIS = ['👩', '👱‍♀️', '🧑‍🦱', '👩‍🦰', '👩‍🦳', '👩‍🦲', '🧕', '👸', '💃', '🌸', '⭐', '💎'];

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'x',         label: 'X (Twitter)' },
  { value: 'threads',   label: 'Threads' },
  { value: 'fanvue',    label: 'Fanvue' },
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

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  tiktok:    'bg-red-500/20 text-red-300 border-red-500/30',
  x:         'bg-slate-500/20 text-slate-300 border-slate-500/30',
  threads:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const CONTENT_TYPE_META: Record<NonNullable<TimeSlot['contentType']>, { label: string; color: string; dot: string }> = {
  reel:     { label: 'Reel',     color: 'bg-violet-500/20 text-violet-300 border-violet-500/30', dot: 'bg-violet-400' },
  carousel: { label: 'Carousel', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',   dot: 'bg-amber-400' },
  story:    { label: 'Story',    color: 'bg-pink-500/20 text-pink-300 border-pink-500/30',       dot: 'bg-pink-400' },
  post:     { label: 'Post',     color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',   dot: 'bg-slate-400' },
};

function deriveContentType(postType: PostType): NonNullable<TimeSlot['contentType']> {
  if (postType.includes('reel')) return 'reel';
  if (postType.includes('story')) return 'story';
  if (postType === 'instagram_post' || postType === 'tiktok_slideshow') return 'carousel';
  return 'post';
}

const DEFAULT_POSTING_FREQUENCY: PostingFrequencyConfig[] = [
  { platform: 'instagram', enabled: true,  postsPerDay: 3, startHour: 8,  endHour: 21, postTypes: ['instagram_reel', 'instagram_post'] },
  { platform: 'tiktok',    enabled: true,  postsPerDay: 3, startHour: 9,  endHour: 21, postTypes: ['tiktok_reel', 'tiktok_slideshow'] },
  { platform: 'threads',   enabled: true,  postsPerDay: 1, startHour: 10, endHour: 18, postTypes: ['threads_post'] },
  { platform: 'x',         enabled: false, postsPerDay: 1, startHour: 9,  endHour: 17, postTypes: ['x_post'] },
];

const DEFAULT_EXIF_PRESET = {
  device: 'iPhone 16 Pro',
  model: 'iPhone17,1',
  lens: 'iPhone 16 Pro back triple camera 6.86mm f/1.78',
  software: 'iOS 18.2.1',
  gpsLatitude: 34.0522,
  gpsLongitude: -118.2437,
  isoVariance: [100, 200, 400, 800],
  focalLengthVariance: [6.86, 9.0, 24.0],
};

type TabId = 'models' | 'team' | 'access';

// ─── Posting frequency stepper ────────────────────────────────────────────────

function CountStepper({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/60 last:border-0">
      <span className="text-sm text-slate-200">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center text-lg font-bold transition-colors"
        >
          −
        </button>
        <span className={`w-8 text-center text-base font-bold ${color}`}>{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center text-lg font-bold transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// ─── Model Form Modal ─────────────────────────────────────────────────────────

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
  const [tab, setTab] = useState<'general' | 'frequency' | 'schedule'>('general');
  const [name, setName] = useState(model?.name || '');
  const [emoji, setEmoji] = useState(model?.profileImage || '👩');
  const [status, setStatus] = useState<'active' | 'paused'>(model?.status || 'active');
  const [schedule, setSchedule] = useState<TimeSlot[]>(model?.postingSchedule || []);
  const [dailyTarget, setDailyTarget] = useState<DailyPostingTarget>(
    model?.dailyTarget ?? { reels: 3, carousels: 1, stories: 2 }
  );

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
        contentType: deriveContentType(slotPostType),
      },
    ]);
  };

  const removeSlot = (id: string) => setSchedule((prev) => prev.filter((s) => s.id !== id));

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({ name, profileImage: emoji, status, postingSchedule: schedule, dailyTarget });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-5 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-white">{model ? 'Edit Model' : 'Add Model'}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {(['general', 'frequency', 'schedule'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
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
                  onClick={() => setStatus((s) => (s === 'active' ? 'paused' : 'active'))}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                    status === 'active'
                      ? 'bg-green-500/15 border-green-500/40 text-green-300'
                      : 'bg-slate-800 border-slate-600 text-slate-400'
                  }`}
                >
                  {status === 'active' ? (
                    <><ToggleRight className="w-5 h-5" /> Active</>
                  ) : (
                    <><ToggleLeft className="w-5 h-5" /> Paused</>
                  )}
                </button>
              </div>
            </div>
          )}

          {tab === 'frequency' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Set the daily posting targets for this model. The manager dashboard will track progress
                and reward meeting all targets.
              </p>
              <div className="card-surface rounded-xl px-4">
                <CountStepper
                  label="Reels per day"
                  value={dailyTarget.reels}
                  onChange={(v) => setDailyTarget((prev) => ({ ...prev, reels: v }))}
                  color="text-violet-400"
                />
                <CountStepper
                  label="Carousels / Posts per day"
                  value={dailyTarget.carousels}
                  onChange={(v) => setDailyTarget((prev) => ({ ...prev, carousels: v }))}
                  color="text-amber-400"
                />
                <CountStepper
                  label="Stories per day"
                  value={dailyTarget.stories}
                  onChange={(v) => setDailyTarget((prev) => ({ ...prev, stories: v }))}
                  color="text-pink-400"
                />
              </div>
              <p className="text-xs text-slate-500 pt-1 text-center">
                Total: {dailyTarget.reels + dailyTarget.carousels + dailyTarget.stories} posts/day
              </p>
            </div>
          )}

          {tab === 'schedule' && (
            <div className="space-y-4">
              {schedule.length > 0 ? (
                <div className="space-y-2">
                  {schedule.map((slot) => {
                    const ct = slot.contentType ?? deriveContentType(slot.postType);
                    const ctMeta = CONTENT_TYPE_META[ct];
                    return (
                      <div key={slot.id} className="flex items-center gap-2 card-surface px-3 py-2 rounded-lg">
                        <span className="font-mono text-sm text-slate-300 w-14">{slot.time}</span>
                        <span className="text-xs text-slate-400 capitalize flex-1">
                          {slot.platform} · {slot.postType.replace(`${slot.platform}_`, '')}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ctMeta.color}`}>
                          {ctMeta.label}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">{slot.recurrence}</span>
                        <button
                          onClick={() => removeSlot(slot.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
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
                    <input
                      type="time"
                      value={slotTime}
                      onChange={(e) => setSlotTime(e.target.value)}
                      className="input-dark py-2 text-sm"
                    />
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
                      {PLATFORM_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-dark text-xs">Post Type</label>
                    <select
                      value={slotPostType}
                      onChange={(e) => setSlotPostType(e.target.value as PostType)}
                      className="input-dark py-2 text-sm"
                    >
                      {POST_TYPE_OPTIONS[slotPlatform].map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-dark text-xs">Recurrence</label>
                    <select
                      value={slotRecurrence}
                      onChange={(e) => setSlotRecurrence(e.target.value as TimeSlot['recurrence'])}
                      className="input-dark py-2 text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekends">Weekends</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={addSlot}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Slot
                </button>
              </div>
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

// ─── Model Card ───────────────────────────────────────────────────────────────

function ModelCard({
  model,
  vaUsers,
  onEdit,
  onDelete,
  confirmDeleteId,
}: {
  model: Model;
  vaUsers: User[];
  onEdit: (model: Model) => void;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
}) {
  const platforms = [...new Set(model.postingSchedule.map((s) => s.platform))];
  const assignedVAs = vaUsers.filter((va) => model.assignedVaIds.includes(va.id));
  const isConfirming = confirmDeleteId === model.id;

  return (
    <div className="card p-5 space-y-4 relative">
      {/* Delete confirm overlay */}
      {isConfirming && (
        <div className="absolute inset-0 z-10 bg-slate-900/90 rounded-xl flex flex-col items-center justify-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          <p className="text-sm font-medium text-white">Delete {model.name}?</p>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(model.id + '__cancel'); }}
              className="btn-secondary text-sm px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(model.id); }}
              className="bg-red-600 hover:bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
            {model.profileImage || '👤'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-base truncate">{model.name}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                model.status === 'active'
                  ? 'bg-green-500/15 border-green-500/30 text-green-400'
                  : 'bg-slate-700 border-slate-600 text-slate-400'
              }`}
            >
              {model.status}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Link
            href="/models"
            className="btn-ghost p-2"
            title="Manage schedule"
          >
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

      {/* Platforms */}
      <div className="flex flex-wrap gap-1.5">
        {platforms.map((p) => (
          <span
            key={p}
            className={`platform-chip border capitalize ${PLATFORM_COLORS[p] || 'bg-slate-700 text-slate-300 border-slate-600'}`}
          >
            {p}
          </span>
        ))}
      </div>

      {/* VA count */}
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        {assignedVAs.length > 0
          ? `${assignedVAs.length} VA${assignedVAs.length !== 1 ? 's' : ''} assigned`
          : 'No VAs assigned'}
      </p>
    </div>
  );
}

// ─── VA Form Modal ────────────────────────────────────────────────────────────

function VAFormModal({
  va,
  onSave,
  onClose,
}: {
  va?: User;
  onSave: (data: { name: string; email: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(va?.name || '');
  const [email, setEmail] = useState(va?.email || '');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    onSave({ name, email });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{va ? 'Edit VA' : 'Add VA'}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label-dark">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark"
              placeholder="e.g. Alex Turner"
            />
          </div>
          <div>
            <label className="label-dark">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark"
              placeholder="va@example.com"
            />
          </div>
          <div className="flex gap-3 pt-2 border-t border-slate-700">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSubmit} className="btn-primary flex-1">
              {va ? 'Save Changes' : 'Add VA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Models Tab ───────────────────────────────────────────────────────────────

function ModelsTab() {
  const { models, vaUsers, addModel, updateModel, deleteModel } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSave = (data: Partial<Model> & { name: string }) => {
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
        exifPreset: DEFAULT_EXIF_PRESET,
        postingSchedule: data.postingSchedule || [],
        postingFrequency: DEFAULT_POSTING_FREQUENCY,
        dailyTarget: data.dailyTarget ?? { reels: 3, carousels: 1, stories: 2 },
        assignedVaIds: [],
        status: data.status || 'active',
        createdAt: new Date().toISOString(),
      });
    }
    setEditingModel(null);
    setShowModal(false);
  };

  const handleDelete = useCallback(
    (rawId: string) => {
      if (rawId.endsWith('__cancel')) {
        setConfirmDeleteId(null);
        return;
      }
      if (confirmDeleteId === rawId) {
        deleteModel(rawId);
        setConfirmDeleteId(null);
      } else {
        setConfirmDeleteId(rawId);
        setTimeout(() => setConfirmDeleteId((cur) => (cur === rawId ? null : cur)), 3000);
      }
    },
    [confirmDeleteId, deleteModel]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Add, edit and remove creator accounts. Manage posting schedules on the{' '}
          <Link href="/models" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
            Models page
          </Link>
          .
        </p>
        <button
          onClick={() => { setEditingModel(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Model
        </button>
      </div>

      {/* Grid */}
      {models.length === 0 ? (
        <div className="card py-16 text-center">
          <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No models yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              vaUsers={vaUsers}
              onEdit={(m) => { setEditingModel(m); setShowModal(true); }}
              onDelete={handleDelete}
              confirmDeleteId={confirmDeleteId}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ModelFormModal
          model={editingModel || undefined}
          vaUsers={vaUsers}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingModel(null); }}
        />
      )}
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab() {
  const {
    vaUsers, models, magicLinks,
    addVAUser, updateVAUser, deleteVAUser,
    addMagicLink, revokeMagicLink,
    currentUser,
  } = useStore();

  const [showVAModal, setShowVAModal] = useState(false);
  const [editingVA, setEditingVA]     = useState<User | null>(null);
  const [confirmDeleteVA, setConfirmDeleteVA] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleSaveVA = (data: { name: string; email: string }) => {
    if (editingVA) {
      updateVAUser(editingVA.id, { name: data.name, email: data.email });
    } else {
      addVAUser({
        id: `va-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: 'va',
        assignedModels: [],
      });
    }
    setEditingVA(null);
    setShowVAModal(false);
  };

  const handleDeleteVA = (id: string) => {
    if (id.endsWith('__cancel')) { setConfirmDeleteVA(null); return; }
    if (confirmDeleteVA === id) {
      deleteVAUser(id);
      setConfirmDeleteVA(null);
    } else {
      setConfirmDeleteVA(id);
      setTimeout(() => setConfirmDeleteVA((cur) => (cur === id ? null : cur)), 3000);
    }
  };

  const getLinkForVA = (vaId: string) =>
    magicLinks.find((l) => l.vaId === vaId && l.isActive);

  const generateLink = (va: User) => {
    const link = createVAMagicLink(va);
    addMagicLink(link);
  };

  const copyLink = (token: string) => {
    const url = getVAMagicLinkURL(token);
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getModelName = (id: string) => models.find((m) => m.id === id)?.name || id;

  return (
    <div className="space-y-8">
      {/* Virtual Assistants */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Virtual Assistants</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              {vaUsers.length} VA{vaUsers.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <button
            onClick={() => { setEditingVA(null); setShowVAModal(true); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Add VA
          </button>
        </div>

        {vaUsers.length === 0 ? (
          <div className="card py-10 text-center">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No virtual assistants yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vaUsers.map((va) => {
              const activeLink = getLinkForVA(va.id);
              const assignedModelNames = va.assignedModels.map(getModelName);
              const isConfirming = confirmDeleteVA === va.id;

              return (
                <div key={va.id} className="card p-4 space-y-3 relative">
                  {/* Delete overlay */}
                  {isConfirming && (
                    <div className="absolute inset-0 z-10 bg-slate-900/90 rounded-xl flex flex-col items-center justify-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <p className="text-sm font-medium text-white">Remove {va.name}?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteVA(va.id + '__cancel')}
                          className="btn-secondary text-sm px-3 py-1.5"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteVA(va.id)}
                          className="bg-red-600 hover:bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {/* VA header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-300 text-base font-bold flex-shrink-0">
                      {va.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{va.name}</p>
                      <p className="text-xs text-slate-400 truncate">{va.email}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {assignedModelNames.length > 0 && (
                        <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          {assignedModelNames.length} model{assignedModelNames.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        onClick={() => { setEditingVA(va); setShowVAModal(true); }}
                        className="btn-ghost p-2"
                        title="Edit VA"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVA(va.id)}
                        className="btn-ghost p-2 hover:text-red-400"
                        title="Remove VA"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Assigned models */}
                  {assignedModelNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-13">
                      {assignedModelNames.map((name) => (
                        <span key={name} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Magic link row */}
                  <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
                    <Link2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-xs text-slate-400 flex-1">Magic Link</span>
                    {activeLink ? (
                      <>
                        <button
                          onClick={() => copyLink(activeLink.token)}
                          className="flex items-center gap-1 text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-600/30 transition-colors"
                        >
                          {copiedToken === activeLink.token
                            ? <><Check className="w-3 h-3" />Copied!</>
                            : <><Copy className="w-3 h-3" />Copy Link</>}
                        </button>
                        <button
                          onClick={() => revokeMagicLink(activeLink.token)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
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
                        <Plus className="w-3 h-3" /> Generate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Users */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white">Admin Users</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Admin access is managed via Discord OAuth.
          </p>
        </div>

        <div className="card p-4 space-y-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-300 text-base font-bold flex-shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{currentUser.name}</p>
                <p className="text-xs text-slate-400">{currentUser.email}</p>
              </div>
              <span className="text-xs bg-blue-500/15 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full">
                Admin
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No admin user loaded.</p>
          )}

          <div className="card-surface rounded-lg px-3 py-2.5 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              Configure <code className="text-slate-300 bg-slate-700 px-1 py-0.5 rounded">DISCORD_CLIENT_ID</code> and{' '}
              <code className="text-slate-300 bg-slate-700 px-1 py-0.5 rounded">DISCORD_CLIENT_SECRET</code> in your
              environment to enable Discord OAuth for admin login.
            </p>
          </div>
        </div>
      </div>

      {showVAModal && (
        <VAFormModal
          va={editingVA || undefined}
          onSave={handleSaveVA}
          onClose={() => { setShowVAModal(false); setEditingVA(null); }}
        />
      )}
    </div>
  );
}

// ─── Access Tab ───────────────────────────────────────────────────────────────

function AccessTab() {
  const { vaUsers, models, magicLinks, addMagicLink } = useStore();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const getLinkForVA = (vaId: string) =>
    magicLinks.find((l) => l.vaId === vaId && l.isActive);

  const copyLink = (token: string) => {
    const url = getVAMagicLinkURL(token);
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const regenerateAllLinks = () => {
    vaUsers.forEach((va) => {
      const existing = getLinkForVA(va.id);
      if (!existing) {
        const link = createVAMagicLink(va);
        addMagicLink(link);
      }
    });
  };

  const getModelName = (id: string) => models.find((m) => m.id === id)?.name || id;

  const formatExpiry = (isoDate: string) => {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const missingLinkCount = vaUsers.filter((va) => !getLinkForVA(va.id)).length;

  return (
    <div className="space-y-6">
      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Admin Access</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Full access to all settings, models, and content. Authenticated via Discord OAuth.
            Admins can see all VA activity and manage every model.
          </p>
        </div>
        <div className="card p-5 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">VA Access</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Limited access via time-bound magic links. Each VA can only see their assigned models.
            No VA can view other VAs&apos; tasks or admin settings.
          </p>
        </div>
      </div>

      {/* Regenerate all button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">VA Access Links</h3>
          {missingLinkCount > 0 && (
            <p className="text-xs text-amber-400 mt-0.5">
              {missingLinkCount} VA{missingLinkCount !== 1 ? 's' : ''} without an active link
            </p>
          )}
        </div>
        <button
          onClick={regenerateAllLinks}
          disabled={missingLinkCount === 0}
          className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate Missing Links
        </button>
      </div>

      {/* VA table */}
      {vaUsers.length === 0 ? (
        <div className="card py-10 text-center">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No VA users configured yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">VA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Models</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Link Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Expires</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {vaUsers.map((va) => {
                  const link = getLinkForVA(va.id);
                  return (
                    <tr key={va.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0">
                            {va.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-100 text-sm">{va.name}</p>
                            <p className="text-xs text-slate-500">{va.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {va.assignedModels.length === 0 ? (
                          <span className="text-xs text-slate-500">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {va.assignedModels.map((mid) => (
                              <span key={mid} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                                {getModelName(mid)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {link ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            No link
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {link ? formatExpiry(link.expiresAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {link ? (
                          <button
                            onClick={() => copyLink(link.token)}
                            className="flex items-center gap-1 text-xs bg-blue-600/20 border border-blue-500/40 text-blue-300 px-2.5 py-1 rounded-lg hover:bg-blue-600/30 transition-colors ml-auto"
                          >
                            {copiedToken === link.token
                              ? <><Check className="w-3 h-3" />Copied</>
                              : <><Copy className="w-3 h-3" />Copy</>}
                          </button>
                        ) : (
                          <button
                            onClick={() => { const l = createVAMagicLink(va); addMagicLink(l); }}
                            className="flex items-center gap-1 text-xs bg-slate-700 border border-slate-600 text-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-600 transition-colors ml-auto"
                          >
                            <Plus className="w-3 h-3" /> Generate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const {
    setModels, setSelectedModelId, setCurrentUser,
    setPosts, setCaptions, setVAUsers, setMagicLinks,
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabId>('models');

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setPosts([]);
    setCaptions(mockCaptions);
    setVAUsers(mockVAUsers);
    setMagicLinks([]);
  }, [setModels, setSelectedModelId, setCurrentUser, setPosts, setCaptions, setVAUsers, setMagicLinks]);

  const TABS: Tab[] = [
    { id: 'models',  label: 'Models', icon: <Boxes className="w-4 h-4" /> },
    { id: 'team',    label: 'Team',   icon: <Users className="w-4 h-4" /> },
    { id: 'access',  label: 'Access', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Page header */}
        <div>
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage models, team members, and VA access links.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 overflow-x-auto no-scrollbar border-b border-slate-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'models'  && <ModelsTab />}
          {activeTab === 'team'    && <TeamTab />}
          {activeTab === 'access'  && <AccessTab />}
        </div>
      </main>
    </div>
  );
}
