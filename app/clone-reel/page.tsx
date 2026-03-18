'use client';

import { useState, useEffect, useId } from 'react';
import { useStore, getVisibleModels } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { mockModels, mockAdmin, mockCaptions } from '@/lib/mockData';
import type { GalleryAsset, Caption, Asset } from '@/types/models';
import {
  Film, Sparkles, X, Check, Plus, Trash2, Play,
  Shuffle, Copy, ChevronRight, Download, AlertCircle,
  Video, FileText, Layers, Clock, ArrowRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchVariant {
  id: string;
  asset: GalleryAsset;
  caption: string;
  captionId?: string;
  selected: boolean;
}

type TabId = 'batch' | 'cloner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildVariants(
  assets: GalleryAsset[],
  captions: string[],
): BatchVariant[] {
  const variants: BatchVariant[] = [];
  for (const asset of assets) {
    for (const caption of captions) {
      variants.push({
        id: `${asset.id}__${encodeURIComponent(caption).slice(0, 20)}_${Math.random().toString(36).slice(2, 7)}`,
        asset,
        caption,
        selected: true,
      });
    }
  }
  return variants;
}

// ─── Batch Creator Tab ────────────────────────────────────────────────────────

function BatchCreatorTab() {
  const router = useRouter();
  const galleryAssets = useStore((s) => s.galleryAssets);
  const captions = useStore((s) => s.captions);
  const addPost = useStore((s) => s.addPost);
  const selectedModelId = useStore((s) => s.selectedModelId);

  // Filter to video assets only (reels need 9:16)
  const videoAssets = galleryAssets.filter((a) => a.fileType === 'video');
  const imageAssets = galleryAssets.filter((a) => a.fileType === 'image');

  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [customCaptions, setCustomCaptions] = useState<string[]>([]);
  const [selectedCaptionIds, setSelectedCaptionIds] = useState<Set<string>>(new Set());
  const [newCaption, setNewCaption] = useState('');
  const [variants, setVariants] = useState<BatchVariant[]>([]);
  const [step, setStep] = useState<'select' | 'preview' | 'done'>('select');
  const [scheduling, setScheduling] = useState(false);
  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [assetMode, setAssetMode] = useState<'video' | 'image'>('video');

  const activeAssets = assetMode === 'video' ? videoAssets : imageAssets;
  const activeSelectedIds = assetMode === 'video' ? selectedVideoIds : selectedImageIds;
  const setActiveSelectedIds = assetMode === 'video' ? setSelectedVideoIds : setSelectedImageIds;

  const toggleAsset = (id: string) => {
    setActiveSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCaption = (id: string) => {
    setSelectedCaptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustomCaption = () => {
    const text = newCaption.trim();
    if (!text) return;
    setCustomCaptions((prev) => [...prev, text]);
    setNewCaption('');
  };

  const removeCustomCaption = (idx: number) => {
    setCustomCaptions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Gather all active captions
  const activeCaptionTexts: string[] = [
    ...captions.filter((c) => selectedCaptionIds.has(c.id)).map((c) => c.text),
    ...customCaptions,
  ];

  const selectedAssetObjs = activeAssets.filter((a) => activeSelectedIds.has(a.id));

  const totalVariants = selectedAssetObjs.length * activeCaptionTexts.length;

  const generateVariants = () => {
    if (selectedAssetObjs.length === 0 || activeCaptionTexts.length === 0) return;
    setVariants(buildVariants(selectedAssetObjs, activeCaptionTexts));
    setStep('preview');
  };

  const toggleVariant = (id: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v))
    );
  };

  const scheduleSelected = async () => {
    const selected = variants.filter((v) => v.selected);
    if (!selectedModelId || selected.length === 0) return;

    setScheduling(true);
    const now = new Date();

    for (let i = 0; i < selected.length; i++) {
      const v = selected[i];
      // Space posts 3 hours apart starting from next hour
      const scheduledTime = new Date(now);
      scheduledTime.setHours(scheduledTime.getHours() + 1 + i * 3);
      scheduledTime.setMinutes(0, 0, 0);

      addPost({
        id: `batch-${Date.now()}-${i}`,
        modelId: selectedModelId,
        platform,
        postType: platform === 'instagram' ? 'instagram_reel' : 'tiktok_reel',
        status: 'scheduled',
        scheduledTime: scheduledTime.toISOString(),
        description: v.caption,
        assets: [{
          id: v.asset.id,
          postId: `batch-${Date.now()}-${i}`,
          fileUrl: v.asset.fileUrl,
          fileName: v.asset.fileName,
          fileType: v.asset.fileType,
          order: 0,
        } satisfies Asset],
        approvalStatus: 'approved',
        isAutoGenerated: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    setScheduling(false);
    setStep('done');
  };

  if (step === 'done') {
    const count = variants.filter((v) => v.selected).length;
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-white">{count} variants scheduled!</h3>
          <p className="text-slate-400 text-sm mt-1">Posts are ready in your schedule planner</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setStep('select'); setVariants([]); setSelectedVideoIds(new Set()); setSelectedImageIds(new Set()); setSelectedCaptionIds(new Set()); setCustomCaptions([]); }}
            className="btn-secondary text-sm"
          >
            Create More
          </button>
          <button
            onClick={() => router.push('/schedule')}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            View Schedule <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    const selected = variants.filter((v) => v.selected);
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Review {variants.length} Variants</h3>
            <p className="text-sm text-slate-400">{selected.length} selected for scheduling</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('select')} className="btn-ghost text-sm">
              Back
            </button>
            <button
              onClick={() => setVariants((prev) => prev.map((v) => ({ ...v, selected: true })))}
              className="btn-ghost text-sm"
            >
              Select All
            </button>
            <button
              onClick={scheduleSelected}
              disabled={selected.length === 0 || scheduling}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {scheduling ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Schedule {selected.length}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {variants.map((v) => (
            <div
              key={v.id}
              onClick={() => toggleVariant(v.id)}
              className={`card p-3 cursor-pointer transition-all ${
                v.selected
                  ? 'border-violet-500/60 bg-violet-500/5'
                  : 'opacity-40'
              }`}
            >
              <div className="flex gap-3 items-start">
                <div className="relative w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800">
                  {v.asset.thumbnailUrl || v.asset.fileUrl ? (
                    <img
                      src={v.asset.thumbnailUrl || v.asset.fileUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-5 h-5 text-slate-600" />
                    </div>
                  )}
                  {v.selected && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 mb-1 font-mono truncate">{v.asset.fileName}</p>
                  <p className="text-xs text-slate-300 line-clamp-4">{v.caption}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform + mode selector */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Platform</p>
          <div className="flex gap-2">
            {(['instagram', 'tiktok'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-all capitalize ${
                  platform === p
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p === 'instagram' ? '📸 Instagram' : '🎵 TikTok'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Asset Type</p>
          <div className="flex gap-2">
            {(['video', 'image'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAssetMode(m)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-all capitalize ${
                  assetMode === m
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {m === 'video' ? '🎬 Videos' : '🖼️ Images'}
              </button>
            ))}
          </div>
        </div>
        {totalVariants > 0 && (
          <div className="ml-auto text-center">
            <p className="text-2xl font-black text-violet-400">{totalVariants}</p>
            <p className="text-xs text-slate-500">variants</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Asset selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Video className="w-4 h-4 text-violet-400" />
              Select {assetMode === 'video' ? 'Videos' : 'Images'} ({activeSelectedIds.size} of {activeAssets.length})
            </h3>
            {activeSelectedIds.size > 0 && (
              <button
                onClick={() => setActiveSelectedIds(new Set())}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {activeAssets.length === 0 ? (
            <div className="card py-10 flex flex-col items-center text-center">
              <Video className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-slate-500 text-sm">No {assetMode} assets in gallery</p>
              <button
                onClick={() => router.push('/gallery')}
                className="btn-ghost text-sm mt-3"
              >
                Go to Gallery
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
              {activeAssets.map((asset) => {
                const sel = activeSelectedIds.has(asset.id);
                return (
                  <div
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all aspect-[9/16] ${
                      sel
                        ? 'border-violet-500 ring-1 ring-violet-500/40'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {asset.thumbnailUrl || asset.fileUrl ? (
                      <img
                        src={asset.thumbnailUrl || asset.fileUrl}
                        alt={asset.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <Video className="w-5 h-5 text-slate-600" />
                      </div>
                    )}
                    {sel && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                      <p className="text-white text-[9px] font-mono truncate">{asset.fileName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Caption selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-400" />
            Select Captions ({activeCaptionTexts.length} active)
          </h3>

          {/* Library captions */}
          {captions.length > 0 && (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-1">From caption library</p>
              {captions.slice(0, 20).map((cap) => {
                const sel = selectedCaptionIds.has(cap.id);
                return (
                  <div
                    key={cap.id}
                    onClick={() => toggleCaption(cap.id)}
                    className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all text-xs ${
                      sel
                        ? 'bg-violet-500/15 border border-violet-500/40 text-violet-200'
                        : 'bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 flex-shrink-0 rounded border mt-0.5 flex items-center justify-center ${
                      sel ? 'bg-violet-600 border-violet-600' : 'border-slate-600'
                    }`}>
                      {sel && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="line-clamp-2">{cap.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom captions */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Custom captions</p>
            <div className="flex gap-2">
              <textarea
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) addCustomCaption(); }}
                placeholder="Type a caption… (⌘Enter to add)"
                rows={2}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 resize-none"
              />
              <button
                onClick={addCustomCaption}
                disabled={!newCaption.trim()}
                className="btn-primary px-3 self-stretch"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {customCaptions.length > 0 && (
              <div className="space-y-1 mt-2 max-h-36 overflow-y-auto">
                {customCaptions.map((cap, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/25 text-xs text-green-300">
                    <span className="flex-1 line-clamp-2">{cap}</span>
                    <button onClick={() => removeCustomCaption(i)}>
                      <X className="w-3.5 h-3.5 text-green-500 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="text-sm text-slate-400">
          {selectedAssetObjs.length > 0 && activeCaptionTexts.length > 0 ? (
            <span>
              <span className="text-white font-semibold">{selectedAssetObjs.length}</span> videos ×{' '}
              <span className="text-white font-semibold">{activeCaptionTexts.length}</span> captions ={' '}
              <span className="text-violet-400 font-bold">{totalVariants} variants</span>
            </span>
          ) : (
            <span className="text-slate-500">Select videos and captions to generate variants</span>
          )}
        </div>
        <button
          onClick={generateVariants}
          disabled={selectedAssetObjs.length === 0 || activeCaptionTexts.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Layers className="w-4 h-4" />
          Generate {totalVariants > 0 ? `${totalVariants} ` : ''}Variants
        </button>
      </div>
    </div>
  );
}

// ─── Caption Cloner Tab ───────────────────────────────────────────────────────

function CaptionClonerTab() {
  const galleryAssets = useStore((s) => s.galleryAssets);
  const [sourceUrl, setSourceUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [timeline, setTimeline] = useState<Array<{ time: string; text: string }>>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const analyzeVideo = async () => {
    if (!sourceUrl) return;
    setAnalyzing(true);
    setTimeline([]);
    setDone(false);
    try {
      // Simulate analysis — in production this calls the reel-cloner agent
      await new Promise((r) => setTimeout(r, 2000));
      setTimeline([
        { time: '00:00', text: 'New content dropping 💎' },
        { time: '00:03', text: 'Check this out 🔥' },
        { time: '00:06', text: 'Swipe to see more ➡️' },
        { time: '00:09', text: 'That girl era 💅' },
        { time: '00:12', text: 'Link in bio 🔗' },
      ]);
    } finally {
      setAnalyzing(false);
    }
  };

  const applyToAssets = async () => {
    if (selectedAssetIds.size === 0 || timeline.length === 0) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    setProcessing(false);
    setDone(true);
    setSelectedAssetIds(new Set());
  };

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <div className="flex items-start gap-3 text-sm text-slate-400 bg-slate-800/60 border border-slate-700/40 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p>
            Paste a viral TikTok or Instagram Reel URL to extract its on-screen text timeline.
            Then select videos from your gallery to apply the same text overlays.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyzeVideo()}
            placeholder="https://www.tiktok.com/@handle/video/…"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={analyzeVideo}
            disabled={!sourceUrl || analyzing}
            className="btn-primary flex items-center gap-2"
          >
            {analyzing ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {analyzing ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>

        {timeline.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2 font-semibold">Extracted Timeline ({timeline.length} overlays)</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {timeline.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-800">
                  <span className="text-xs text-slate-500 w-12 font-mono shrink-0">{item.time}</span>
                  <span className="text-sm text-slate-200 flex-1">{item.text}</span>
                  <button
                    onClick={() => setTimeline((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-slate-600 hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {timeline.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">
              Select Target Assets ({selectedAssetIds.size} selected)
            </h3>
            {selectedAssetIds.size > 0 && (
              <button onClick={() => setSelectedAssetIds(new Set())} className="text-xs text-slate-500 hover:text-slate-300">
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {galleryAssets.map((asset) => {
              const sel = selectedAssetIds.has(asset.id);
              return (
                <div
                  key={asset.id}
                  onClick={() => toggleAsset(asset.id)}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 aspect-square transition-all ${
                    sel ? 'border-violet-500' : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <img src={asset.thumbnailUrl || asset.fileUrl} alt="" className="w-full h-full object-cover" />
                  {sel && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
            {done ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Applied to {selectedAssetIds.size} assets
              </div>
            ) : (
              <div />
            )}
            <button
              onClick={applyToAssets}
              disabled={selectedAssetIds.size === 0 || processing}
              className="btn-primary flex items-center gap-2"
            >
              {processing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Apply to {selectedAssetIds.size} Asset{selectedAssetIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CloneReelPage() {
  const { setModels, setCurrentUser, setCaptions } = useStore();
  const [tab, setTab] = useState<TabId>('batch');

  useEffect(() => {
    setModels(mockModels);
    setCurrentUser(mockAdmin);
    setCaptions(mockCaptions);
  }, [setModels, setCurrentUser, setCaptions]);

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600/20 border border-violet-500/30 rounded-xl flex items-center justify-center">
            <Film className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Reel Creator</h2>
            <p className="text-sm text-slate-400">Batch variants · Caption overlays</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-700/60">
          {([
            { id: 'batch' as TabId, label: 'Batch Caption Creator', icon: <Layers className="w-4 h-4" /> },
            { id: 'cloner' as TabId, label: 'Caption Cloner', icon: <Copy className="w-4 h-4" /> },
          ]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                tab === id
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {tab === 'batch' && <BatchCreatorTab />}
        {tab === 'cloner' && <CaptionClonerTab />}
      </main>
    </div>
  );
}
