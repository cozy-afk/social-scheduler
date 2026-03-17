'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockVAUsers } from '@/lib/mockData';
import { Model } from '@/types/models';
import { Building2, Plus, Settings, Edit2, Users, X, Check } from 'lucide-react';
import Link from 'next/link';

// ─── Constants ───────────────────────────────────────────────────────────────

const PROFILE_EMOJIS = ['👩', '👱‍♀️', '🧑‍🦱', '👩‍🦰', '👩‍🦳', '👩‍🦲', '🧕', '👸', '💃', '🌸', '⭐', '💎'];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  tiktok: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  x: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  threads: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  fanvue: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

// ─── Add Model Modal ──────────────────────────────────────────────────────────

interface AddModelModalProps {
  onSave: (model: Model) => void;
  onClose: () => void;
}

function AddModelModal({ onSave, onClose }: AddModelModalProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👩');
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [nameError, setNameError] = useState('');

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required.');
      return;
    }

    const newModel: Model = {
      id: `model-${Date.now()}`,
      name: trimmed,
      profileImage: emoji,
      status,
      agencyId: 'agency-1',
      fanvueAccountId: '',
      s3Folder: '',
      exifPreset: {
        device: 'iPhone 16 Pro',
        model: 'iPhone17,1',
        lens: 'iPhone 16 Pro back triple camera 6.86mm f/1.78',
        software: 'iOS 18.2.1',
        gpsLatitude: 34.0522,
        gpsLongitude: -118.2437,
        isoVariance: [100, 200, 400, 800],
        focalLengthVariance: [6.86, 9.0, 24.0],
      },
      assignedVaIds: [],
      postingSchedule: [],
      postingFrequency: [],
      createdAt: new Date().toISOString(),
    };

    onSave(newModel);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white">Add Model</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Emoji picker */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Profile Emoji</label>
            <div className="flex flex-wrap gap-2">
              {PROFILE_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all border ${
                    emoji === e
                      ? 'bg-blue-600 border-blue-500 scale-110'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError('');
              }}
              placeholder="e.g. Emma Rose"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
          </div>

          {/* Status toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
            <div className="flex gap-2">
              {(['active', 'paused'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    status === s
                      ? s === 'active'
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {status === s && <Check className="w-3 h-3" />}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Add Model
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Model Card ───────────────────────────────────────────────────────────────

interface ModelCardProps {
  model: Model;
  onEdit: (model: Model) => void;
}

function ModelCard({ model, onEdit }: ModelCardProps) {
  const platforms = Array.from(
    new Set(model.postingSchedule.map((s) => s.platform))
  );

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-600 transition-colors">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl flex-shrink-0">
            {model.profileImage || '👩'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{model.name}</p>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                model.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {model.status}
            </span>
          </div>
        </div>
      </div>

      {/* Platform chips */}
      {platforms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((p) => (
            <span
              key={p}
              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                PLATFORM_COLORS[p] ?? 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Link
          href={`/models/${model.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
        >
          <Settings className="w-3 h-3" />
          Settings
        </Link>
        <button
          onClick={() => onEdit(model)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
      </div>
    </div>
  );
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

interface QuickActionCardProps {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function QuickActionCard({ label, description, href, icon }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-700/60 rounded-xl hover:border-slate-500 hover:bg-slate-800/60 transition-all group"
    >
      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/30 transition-colors">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgencyPage() {
  const { models, setModels, setCurrentUser, setVAUsers, addModel } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  useEffect(() => {
    setModels(mockModels);
    setCurrentUser(mockAdmin);
    setVAUsers(mockVAUsers);
  }, [setModels, setCurrentUser, setVAUsers]);

  function handleAddModel(model: Model) {
    addModel(model);
    setShowAddModal(false);
  }

  function handleEditModel(model: Model) {
    setEditingModel(model);
  }

  const quickActions: QuickActionCardProps[] = [
    {
      label: 'View Calendar',
      description: 'Scheduled posts at a glance',
      href: '/',
      icon: <span className="text-blue-300 text-sm">📅</span>,
    },
    {
      label: 'Caption Library',
      description: 'Browse and manage captions',
      href: '/captions',
      icon: <span className="text-blue-300 text-sm">💬</span>,
    },
    {
      label: 'Analytics',
      description: 'Performance metrics',
      href: '/analytics',
      icon: <span className="text-blue-300 text-sm">📊</span>,
    },
    {
      label: 'Gallery',
      description: 'Media asset vault',
      href: '/gallery',
      icon: <span className="text-blue-300 text-sm">🖼️</span>,
    },
    {
      label: 'Stories',
      description: 'Story generation & automation',
      href: '/stories',
      icon: <span className="text-blue-300 text-sm">✨</span>,
    },
  ];

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page heading */}
        <div className="flex items-start gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Agency Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Manage your models, posting schedules, and team.
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Model Roster */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-white">Model Roster</h2>
                <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5">
                  {models.length}
                </span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Model
              </button>
            </div>

            {models.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-700/60 rounded-xl">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No models yet.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add your first model
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {models.map((model) => (
                  <ModelCard key={model.id} model={model} onEdit={handleEditModel} />
                ))}
              </div>
            )}
          </div>

          {/* Right — Quick Actions */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
            </div>
            <div className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <QuickActionCard key={action.href} {...action} />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Add Model Modal */}
      {showAddModal && (
        <AddModelModal
          onSave={handleAddModel}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit model — inform user to use the full settings page */}
      {editingModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl p-6 text-center">
            <p className="text-sm text-slate-300 mb-1">
              To edit <span className="text-white font-medium">{editingModel.name}</span>, use the full settings page.
            </p>
            <p className="text-xs text-slate-500 mb-5">
              All schedule, VA assignment, and integration options are available there.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingModel(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
              >
                Cancel
              </button>
              <Link
                href={`/models/${editingModel.id}`}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white text-center transition-colors"
                onClick={() => setEditingModel(null)}
              >
                Open Settings
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
