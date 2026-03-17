'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Check, Film } from 'lucide-react';
import { useStore } from '@/lib/store';
import {
  CropRatio,
  GalleryAsset,
  Platform,
  PostType,
  StagedVariant,
} from '@/types/models';

// ─── Platform metadata ────────────────────────────────────────────────────────

const PLATFORM_ACTIVE: Record<Platform, string> = {
  instagram: 'border-pink-500/60 bg-pink-500/15 text-pink-300',
  tiktok: 'border-red-500/60 bg-red-500/15 text-red-300',
  x: 'border-slate-400/60 bg-slate-500/15 text-slate-200',
  threads: 'border-purple-500/60 bg-purple-500/15 text-purple-300',
  fanvue: 'border-orange-500/60 bg-orange-500/15 text-orange-300',
};

const PLATFORM_ICON: Record<Platform, string> = {
  instagram: '📸',
  tiktok: '🎵',
  x: '𝕏',
  threads: '🧵',
  fanvue: '🎭',
};

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  threads: 'Threads',
  fanvue: 'Fanvue',
};

const RATIO_PRESETS: Record<CropRatio, Platform[]> = {
  '1:1': ['instagram', 'threads', 'fanvue'],
  '4:5': ['instagram', 'fanvue'],
  '9:16': ['instagram', 'tiktok'],
};

const POST_TYPE_MAP: Record<Platform, Record<CropRatio, PostType>> = {
  instagram: {
    '1:1': 'instagram_post',
    '4:5': 'instagram_post',
    '9:16': 'instagram_reel',
  },
  tiktok: {
    '1:1': 'tiktok_slideshow',
    '4:5': 'tiktok_slideshow',
    '9:16': 'tiktok_reel',
  },
  x: {
    '1:1': 'x_post',
    '4:5': 'x_post',
    '9:16': 'x_post',
  },
  threads: {
    '1:1': 'threads_post',
    '4:5': 'threads_post',
    '9:16': 'threads_post',
  },
  fanvue: {
    '1:1': 'fanvue_post',
    '4:5': 'fanvue_post',
    '9:16': 'fanvue_post',
  },
};

// ─── Card state ───────────────────────────────────────────────────────────────

interface CardState {
  selectedPlatforms: Platform[];
  date: string;
  time: string;
  description: string;
}

// ─── FinalAssetCard ───────────────────────────────────────────────────────────

interface FinalAssetCardProps {
  asset: GalleryAsset;
  ratio: CropRatio;
  variant: StagedVariant;
  state: CardState;
  onChange: (next: Partial<CardState>) => void;
}

function FinalAssetCard({
  asset,
  ratio,
  variant,
  state,
  onChange,
}: FinalAssetCardProps) {
  const { selectedPlatforms, date, time, description } = state;

  const previewWidth = ratio === '9:16' ? 56 : 80;
  const previewHeight =
    ratio === '9:16' ? 100 : ratio === '4:5' ? 100 : 80;

  function togglePlatform(p: Platform) {
    const next = selectedPlatforms.includes(p)
      ? selectedPlatforms.filter((x) => x !== p)
      : [...selectedPlatforms, p];
    onChange({ selectedPlatforms: next });
  }

  function applyPreset(r: CropRatio) {
    onChange({ selectedPlatforms: RATIO_PRESETS[r] });
  }

  return (
    <div className="card p-4 space-y-4">
      {/* Top: thumbnail + ratio badge + file name */}
      <div className="flex gap-4 items-start">
        <div
          className="flex-shrink-0 rounded-xl overflow-hidden bg-slate-800"
          style={{ width: previewWidth, height: previewHeight }}
        >
          {asset.fileType === 'image' ? (
            <img
              src={variant.editResult!.url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-6 h-6 text-slate-600" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {ratio}
            </span>
            <p className="text-sm font-medium text-slate-200 truncate">
              {asset.fileName}
            </p>
          </div>
          {variant.editResult?.namedFilter &&
            variant.editResult.namedFilter !== '' && (
              <p className="text-xs text-slate-500">
                Filter: {variant.editResult.namedFilter}
              </p>
            )}
        </div>
      </div>

      {/* Platform multi-select */}
      <div>
        <label className="label-dark">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {(['instagram', 'tiktok', 'x', 'threads', 'fanvue'] as Platform[]).map((p) => {
            const isSelected = selectedPlatforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  isSelected
                    ? PLATFORM_ACTIVE[p]
                    : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
                <span>{PLATFORM_ICON[p]}</span>
                {PLATFORM_LABEL[p]}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => applyPreset(ratio)}
            className="px-3 py-1.5 rounded-xl border border-dashed border-slate-600 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-300 transition-all"
          >
            Presets
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label-dark">Post Description</label>
        <textarea
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          className="input-dark resize-none text-sm"
          placeholder="Caption for this post…"
        />
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-dark">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onChange({ date: e.target.value })}
            className="input-dark"
          />
        </div>
        <div>
          <label className="label-dark">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => onChange({ time: e.target.value })}
            className="input-dark"
          />
        </div>
      </div>
    </div>
  );
}

// ─── BatchScheduler ───────────────────────────────────────────────────────────

export default function BatchScheduler() {
  const { stagedAssets, clearStaging, setWorkflowStep, addPost, selectedModelId } =
    useStore();

  // Build the flat list of (asset, ratio, variant) tuples to schedule
  const editedEntries = useMemo(() => {
    const entries: { asset: GalleryAsset; ratio: CropRatio; variant: StagedVariant }[] =
      [];
    for (const sa of stagedAssets) {
      if (sa.skipped) continue;
      for (const v of sa.variants) {
        if (v.edited) {
          entries.push({ asset: sa.asset, ratio: v.ratio, variant: v });
        }
      }
    }
    return entries;
  }, [stagedAssets]);

  // Lifted card state array — one entry per editedEntry
  const [cardStates, setCardStates] = useState<CardState[]>(() =>
    editedEntries.map(({ ratio }) => ({
      selectedPlatforms: RATIO_PRESETS[ratio],
      date: '',
      time: '09:00',
      description: '',
    }))
  );

  // Apply-to-all bar state
  const [globalDate, setGlobalDate] = useState('');
  const [globalTime, setGlobalTime] = useState('09:00');

  function updateCard(index: number, next: Partial<CardState>) {
    setCardStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...next } : s))
    );
  }

  function applyToAll() {
    setCardStates((prev) =>
      prev.map((s) => ({
        ...s,
        ...(globalDate ? { date: globalDate } : {}),
        ...(globalTime ? { time: globalTime } : {}),
      }))
    );
  }

  const readyCount = cardStates.filter(
    (s) => s.date !== '' && s.selectedPlatforms.length > 0
  ).length;

  function handleSchedule() {
    editedEntries.forEach(({ asset, ratio, variant }, i) => {
      const { selectedPlatforms, date, time, description } = cardStates[i];
      if (!date || selectedPlatforms.length === 0) return;

      selectedPlatforms.forEach((platform) => {
        addPost({
          id: `post-${Date.now()}-${platform}-${Math.random()
            .toString(36)
            .slice(2)}`,
          modelId: selectedModelId || 'default',
          platform,
          postType: POST_TYPE_MAP[platform][ratio],
          scheduledTime: `${date}T${time || '09:00'}:00`,
          status: 'scheduled',
          description,
          assets: [
            {
              id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              postId: '',
              fileUrl: variant.editResult!.url,
              fileName: asset.fileName,
              fileType: asset.fileType,
              order: 1,
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    });

    clearStaging();
    setWorkflowStep('gallery');
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto no-scrollbar">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => setWorkflowStep('staging')}
          className="btn-ghost flex items-center gap-2 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Staging
        </button>

        <div className="text-center">
          <h2 className="text-base font-bold text-white">Schedule Batch</h2>
          <p className="text-xs text-slate-400">
            {editedEntries.length} post{editedEntries.length !== 1 ? 's' : ''}{' '}
            ready
          </p>
        </div>

        {/* Spacer to keep header balanced */}
        <div className="w-[110px]" />
      </div>

      {/* ── Scrollable body ── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4 pb-32">
        {editedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <Calendar className="w-10 h-10 opacity-40" />
            <p className="text-sm">No edited variants to schedule.</p>
            <button
              onClick={() => setWorkflowStep('staging')}
              className="btn-secondary text-sm mt-2"
            >
              Back to Staging
            </button>
          </div>
        ) : (
          <>
            {/* Apply to all bar */}
            <div className="card p-4 flex flex-col sm:flex-row gap-3 items-end">
              <div className="text-sm font-medium text-slate-300 whitespace-nowrap">
                Apply to all:
              </div>
              <div className="flex gap-3 flex-1 w-full">
                <input
                  type="date"
                  value={globalDate}
                  onChange={(e) => setGlobalDate(e.target.value)}
                  className="input-dark flex-1"
                />
                <input
                  type="time"
                  value={globalTime}
                  onChange={(e) => setGlobalTime(e.target.value)}
                  className="input-dark"
                  style={{ width: 130 }}
                />
                <button
                  onClick={applyToAll}
                  className="btn-secondary text-sm whitespace-nowrap"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Individual cards */}
            {editedEntries.map(({ asset, ratio, variant }, i) => (
              <FinalAssetCard
                key={`${asset.id}-${ratio}`}
                asset={asset}
                ratio={ratio}
                variant={variant}
                state={cardStates[i]}
                onChange={(next) => updateCard(i, next)}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Sticky footer ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-4 flex items-center justify-between z-10">
        <p className="text-xs text-slate-500">
          {readyCount} of {editedEntries.length} posts configured
        </p>
        <button
          onClick={handleSchedule}
          disabled={readyCount === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-40"
        >
          Schedule {readyCount > 0 ? readyCount : editedEntries.length} Post
          {(readyCount !== 1 && editedEntries.length !== 1) ? 's' : ''}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
