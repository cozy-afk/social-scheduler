'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, Calendar, Film, Zap, X, Check, Pencil, Globe, Image, BookOpen, FileText, AlertTriangle, Crop } from 'lucide-react';
import { useStore } from '@/lib/store';
import { GalleryAsset, PostType, Platform, TimeSlot } from '@/types/models';
import { addDays, format, startOfDay } from 'date-fns';
import { PLATFORM_THEMES } from '@/lib/constants/platform';
import NativeEditor, { EditorResult } from '@/components/NativeEditor';
import { generateSmartSlots, formatTimezone, PLATFORM_PEAK_HOURS } from '@/lib/utils/smartSchedule';

type ContentType = NonNullable<TimeSlot['contentType']>;

interface ScheduleSlot {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  platform: Platform;
  postType: PostType;
  contentType: ContentType;
  assetId: string | null;
}

const CONTENT_TYPE_STYLES: Record<ContentType, { label: string; badgeClass: string; icon: React.ElementType }> = {
  reel:     { label: 'Reel',     badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/25', icon: Film },
  carousel: { label: 'Carousel', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/25',   icon: Image },
  story:    { label: 'Story',    badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/25',       icon: BookOpen },
  post:     { label: 'Post',     badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/25',   icon: FileText },
};

function deriveContentType(postType: PostType): ContentType {
  if (postType.includes('reel')) return 'reel';
  if (postType.includes('story')) return 'story';
  if (postType === 'instagram_post' || postType === 'tiktok_slideshow') return 'carousel';
  return 'post';
}

function AssetCard({
  asset,
  onDragStart,
  usageCount,
}: {
  asset: GalleryAsset;
  onDragStart: () => void;
  usageCount: number;
}) {
  const isVideo = asset.fileType === 'video';
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="card p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all hover:border-violet-500/30"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: 'var(--bg-elevated)' }}>
        {!isVideo && asset.fileUrl ? (
          <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Film className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white truncate font-medium">{asset.fileName}</p>
        <span className={`text-[10px] font-semibold ${isVideo ? 'text-violet-400' : 'text-amber-400'}`}>
          {isVideo ? 'Video → Reel/Story' : 'Image → Carousel/Post'}
        </span>
      </div>
      {usageCount > 0 && (
        <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded flex-shrink-0">
          ×{usageCount}
        </span>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  asset,
  editResult,
  isDragOver,
  isDragIncompat,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
  onEdit,
  onResizeCarousel,
}: {
  slot: ScheduleSlot;
  asset: GalleryAsset | undefined;
  editResult?: EditorResult;
  isDragOver: boolean;
  isDragIncompat: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onResizeCarousel?: () => void;
}) {
  const theme = PLATFORM_THEMES[slot.platform];
  const appliedFilter = editResult?.filter && editResult.filter !== 'none' ? editResult.filter : undefined;

  // Carousel aspect ratio check: IG carousels must be 1:1 or 4:5 for ads eligibility
  const cropRatio = editResult?.cropRatio;
  const needsCarouselWarning =
    slot.contentType === 'carousel' &&
    slot.platform === 'instagram' &&
    asset != null &&
    cropRatio !== '1:1' &&
    cropRatio !== '4:5';

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-xl p-3 border transition-all min-h-[72px] ${
        isDragIncompat
          ? 'border-red-500/50 bg-red-500/05'
          : isDragOver
          ? 'border-violet-500/60'
          : asset
          ? 'border-green-500/20'
          : 'border-dashed border-white/10 hover:border-white/20'
      }`}
      style={{
        background: isDragIncompat
          ? 'rgba(239,68,68,0.04)'
          : isDragOver
          ? 'rgba(124,58,237,0.08)'
          : asset
          ? 'rgba(34,197,94,0.04)'
          : 'rgba(255,255,255,0.02)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${theme.bg}`} />
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{slot.platform}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${CONTENT_TYPE_STYLES[slot.contentType].badgeClass}`}>
          {CONTENT_TYPE_STYLES[slot.contentType].label}
        </span>
        <span className="text-[10px] text-zinc-600 ml-auto font-mono">{slot.time}</span>
      </div>

      {isDragIncompat ? (
        <p className="text-[10px] text-red-400 font-medium">
          {slot.contentType === 'carousel' ? '✕ Videos cannot go in carousel slots' : '✕ Images cannot go in reel/story slots'}
        </p>
      ) : asset ? (
        <>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ background: 'var(--bg-elevated)' }}>
              {asset.fileType === 'image' && asset.fileUrl ? (
                <img
                  src={asset.fileUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: appliedFilter }}
                />
              ) : (
                <Film className="w-4 h-4 m-auto mt-2" style={{ color: 'var(--text-muted)' }} />
              )}
              {editResult && (
                <div
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-tl-md flex items-center justify-center"
                  style={{ background: 'var(--accent-violet)' }}
                  title={`Filter: ${editResult.filterLabel}`}
                >
                  <Pencil className="w-1.5 h-1.5 text-white" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-zinc-300 truncate flex-1">{asset.fileName}</p>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={onEdit}
                className="p-1 text-zinc-600 hover:text-violet-400 transition-colors"
                title="Edit in native editor"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={onRemove} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          {needsCarouselWarning && (
            <div className="mt-1.5 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2 py-1">
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span className="text-[10px] text-amber-300 flex-1">Not ads-eligible — needs 1:1 or 4:5</span>
              <button
                onClick={onResizeCarousel}
                className="text-[10px] text-amber-400 hover:text-amber-200 font-semibold flex items-center gap-0.5 transition-colors"
              >
                <Crop className="w-2.5 h-2.5" /> Resize
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {isDragOver
            ? 'Drop here'
            : slot.contentType === 'reel' || slot.contentType === 'story'
            ? 'Drop video here'
            : slot.contentType === 'carousel'
            ? 'Drop image(s) here'
            : 'Drop asset here'}
        </p>
      )}
    </div>
  );
}

export default function BatchScheduler() {
  const { stagedAssets, clearStaging, setWorkflowStep, addPost, selectedModelId, models } = useStore();
  const selectedModel = models.find((m) => m.id === selectedModelId);

  const assets = useMemo(
    () => stagedAssets.filter((sa) => !sa.skipped).map((sa) => sa.asset),
    [stagedAssets]
  );

  const modelTimezone = selectedModel?.timezone ?? 'America/New_York';

  // Build upcoming slots for next 14 days
  // Uses the model's configured postingSchedule when available; falls back to
  // smart peak-hour slots derived from the model's timezone + platform peaks.
  const slots = useMemo<ScheduleSlot[]>(() => {
    if (!selectedModel) return [];

    const hasSchedule = selectedModel.postingSchedule.length > 0;

    if (hasSchedule) {
      // Use configured schedule, but filter out late-night hours in model timezone
      const today = startOfDay(new Date());
      const result: ScheduleSlot[] = [];
      for (let i = 0; i < 14; i++) {
        const date = addDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = date.getDay();
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        for (const slot of selectedModel.postingSchedule) {
          const applies =
            slot.recurrence === 'daily' ||
            (slot.recurrence === 'weekdays' && isWeekday) ||
            (slot.recurrence === 'weekends' && isWeekend);
          if (!applies) continue;
          const localHour = parseInt(slot.time.split(':')[0]);
          // Skip blackout hours (midnight–6am local)
          if (localHour >= 0 && localHour < 7) continue;
          result.push({
            id: `${dateStr}-${slot.id}`,
            date: dateStr,
            time: slot.time,
            platform: slot.platform,
            postType: slot.postType,
            contentType: slot.contentType ?? deriveContentType(slot.postType),
            assetId: null,
          });
        }
      }
      return result;
    }

    // No schedule configured — generate smart peak-hour slots from the
    // platforms this model uses, respecting timezone
    const usedPlatforms = Array.from(
      new Set(assets.map(() => 'instagram' as Platform))
    );
    const platforms: Platform[] = usedPlatforms.length > 0
      ? usedPlatforms
      : ['instagram', 'tiktok'];

    return generateSmartSlots(platforms, modelTimezone).map((s) => ({
      id: s.id,
      date: s.date,
      time: s.time,
      platform: s.platform,
      postType: s.platform === 'tiktok' ? 'tiktok_reel' : 'instagram_reel' as PostType,
      contentType: 'reel' as ContentType,
      assetId: null,
    }));
  }, [selectedModel, modelTimezone, assets]);

  // slotId → assetId (many slots can share the same asset for cross-posting)
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});
  const [dragAssetId, setDragAssetId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editResults, setEditResults] = useState<Record<string, EditorResult>>({});
  // slotId → resize-target: open editor in crop mode for carousel resize
  const [resizingSlotId, setResizingSlotId] = useState<string | null>(null);

  // How many slots each asset has been assigned to
  const assetUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const assetId of Object.values(slotAssignments)) {
      counts[assetId] = (counts[assetId] ?? 0) + 1;
    }
    return counts;
  }, [slotAssignments]);

  // Is the currently-dragged asset incompatible with a given slot?
  const isDragIncompat = useCallback((slot: ScheduleSlot) => {
    if (!dragAssetId) return false;
    const asset = assets.find((a) => a.id === dragAssetId);
    if (!asset) return false;
    const isVideo = asset.fileType === 'video';
    const isImage = asset.fileType === 'image';
    if (isVideo && (slot.contentType === 'carousel')) return true;
    if (isImage && (slot.contentType === 'reel' || slot.contentType === 'story')) return true;
    return false;
  }, [dragAssetId, assets]);

  const handleAutoFill = useCallback(() => {
    const emptySlots = slots.filter((s) => !slotAssignments[s.id]);
    const newAssignments: Record<string, string> = { ...slotAssignments };

    const videoAssets = assets.filter((a) => a.fileType === 'video');
    const imageAssets = assets.filter((a) => a.fileType === 'image');

    // Group empty slots by date+time so the same asset fills all compatible
    // slots at the same time (e.g. IG Reel 09:00 + TikTok Reel 09:00 → same video)
    const timeGroups: Record<string, ScheduleSlot[]> = {};
    for (const slot of emptySlots) {
      const key = `${slot.date}-${slot.time}`;
      if (!timeGroups[key]) timeGroups[key] = [];
      timeGroups[key].push(slot);
    }

    let videoIdx = 0;
    let imageIdx = 0;

    for (const group of Object.values(timeGroups)) {
      const videoAsset = videoIdx < videoAssets.length ? videoAssets[videoIdx] : undefined;
      const imageAsset = imageIdx < imageAssets.length ? imageAssets[imageIdx] : undefined;

      let usedVideo = false;
      let usedImage = false;

      for (const slot of group) {
        if (slot.contentType === 'reel' || slot.contentType === 'story') {
          // STRICT: only videos in reel/story slots
          if (videoAsset) {
            newAssignments[slot.id] = videoAsset.id;
            usedVideo = true;
          }
        } else if (slot.contentType === 'carousel') {
          // STRICT: only images in carousel slots
          if (imageAsset) {
            newAssignments[slot.id] = imageAsset.id;
            usedImage = true;
          }
        } else {
          // Post slot: prefer video, fallback image
          const any = videoAsset ?? imageAsset;
          if (any) {
            newAssignments[slot.id] = any.id;
            if (any.fileType === 'video') usedVideo = true;
            else usedImage = true;
          }
        }
      }

      // Advance indices only when the asset was actually used in this time group
      if (usedVideo) videoIdx++;
      if (usedImage) imageIdx++;
    }

    setSlotAssignments(newAssignments);
  }, [assets, slots, slotAssignments]);

  const handleDrop = useCallback((slotId: string) => {
    if (!dragAssetId) return;
    const slot = slots.find((s) => s.id === slotId);
    const asset = assets.find((a) => a.id === dragAssetId);
    if (slot && asset) {
      const isVideo = asset.fileType === 'video';
      const isImage = asset.fileType === 'image';
      // Block incompatible drops
      if (isVideo && slot.contentType === 'carousel') { setDragAssetId(null); setDragOverSlotId(null); return; }
      if (isImage && (slot.contentType === 'reel' || slot.contentType === 'story')) { setDragAssetId(null); setDragOverSlotId(null); return; }
    }
    // Allow the same asset in multiple slots — no eviction
    setSlotAssignments((prev) => ({ ...prev, [slotId]: dragAssetId }));
    setDragAssetId(null);
    setDragOverSlotId(null);
  }, [dragAssetId, slots, assets]);

  const handleRemoveFromSlot = useCallback((slotId: string) => {
    setSlotAssignments((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }, []);

  const handleSaveEdit = useCallback((result: EditorResult) => {
    const targetSlotId = editingSlotId ?? resizingSlotId;
    if (!targetSlotId) return;
    setEditResults((prev) => ({ ...prev, [targetSlotId]: result }));
    setEditingSlotId(null);
    setResizingSlotId(null);
  }, [editingSlotId, resizingSlotId]);

  const scheduledCount = Object.keys(slotAssignments).length;
  const uniqueAssetsUsed = new Set(Object.values(slotAssignments)).size;

  const handleSchedule = useCallback(() => {
    for (const [slotId, assetId] of Object.entries(slotAssignments)) {
      const slot = slots.find((s) => s.id === slotId);
      const asset = assets.find((a) => a.id === assetId);
      if (!slot || !asset) continue;
      const stagedAsset = stagedAssets.find((sa) => sa.asset.id === assetId);
      const finalFileUrl = stagedAsset?.renderedUrl ?? asset.fileUrl;
      addPost({
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        modelId: selectedModelId || 'default',
        platform: slot.platform,
        postType: slot.postType,
        scheduledTime: `${slot.date}T${slot.time}:00`,
        status: 'scheduled',
        description: '',
        imageCaption: stagedAsset?.captionText ?? '',
        assets: [{
          id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          postId: '',
          fileUrl: finalFileUrl,
          fileName: asset.fileName,
          fileType: asset.fileType,
          order: 1,
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    clearStaging();
    setWorkflowStep('gallery');
  }, [slotAssignments, slots, assets, stagedAssets, addPost, selectedModelId, clearStaging, setWorkflowStep]);

  // Group slots by date for display
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, ScheduleSlot[]> = {};
    for (const slot of slots) {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    }
    return grouped;
  }, [slots]);

  const activeEditorSlotId = editingSlotId ?? resizingSlotId;
  const activeEditorAsset = activeEditorSlotId
    ? assets.find((a) => a.id === slotAssignments[activeEditorSlotId])
    : null;

  return (
    <>
    {activeEditorAsset && activeEditorSlotId && (
      <NativeEditor
        mediaUrl={activeEditorAsset.fileUrl}
        mediaType={activeEditorAsset.fileType}
        initialResult={editResults[activeEditorSlotId]}
        onSave={handleSaveEdit}
        onClose={() => { setEditingSlotId(null); setResizingSlotId(null); }}
      />
    )}
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg-app)' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
        style={{ background: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={() => setWorkflowStep('staging')} className="btn-ghost flex items-center gap-2 text-sm">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="text-center">
          <h2 className="text-base font-bold text-white">Schedule Assets</h2>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Globe className="w-3 h-3 text-violet-400" />
            <p className="text-[10px] text-violet-300">{formatTimezone(modelTimezone)}</p>
          </div>
        </div>
        <button onClick={handleAutoFill} className="btn-secondary text-xs flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          Auto-fill
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Left: Assets */}
        <div className="w-64 flex-shrink-0 border-r overflow-y-auto no-scrollbar p-4 flex flex-col gap-3"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'var(--bg-sidebar)' }}>
          <p className="section-title">Assets ({assets.length})</p>
          {assets.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No assets staged</p>
          ) : (
            assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                usageCount={assetUsageCounts[asset.id] ?? 0}
                onDragStart={() => setDragAssetId(asset.id)}
              />
            ))
          )}
        </div>

        {/* Right: Calendar slots */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {Object.keys(slotsByDate).length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No posting schedule configured</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Set up a schedule in Model Settings</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl">
              {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                    {format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d')}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {dateSlots.map((slot) => {
                      const assetId = slotAssignments[slot.id];
                      const asset = assets.find((a) => a.id === assetId);
                      return (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          asset={asset}
                          editResult={editResults[slot.id]}
                          isDragOver={dragOverSlotId === slot.id}
                          isDragIncompat={dragOverSlotId === slot.id && isDragIncompat(slot)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverSlotId(slot.id); }}
                          onDragLeave={() => setDragOverSlotId(null)}
                          onDrop={() => handleDrop(slot.id)}
                          onRemove={() => handleRemoveFromSlot(slot.id)}
                          onEdit={() => { if (asset) setEditingSlotId(slot.id); }}
                          onResizeCarousel={() => setResizingSlotId(slot.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t"
        style={{ background: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {scheduledCount} slot{scheduledCount !== 1 ? 's' : ''} filled
          {uniqueAssetsUsed > 0 && ` · ${uniqueAssetsUsed} asset${uniqueAssetsUsed !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={handleSchedule}
          disabled={scheduledCount === 0}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Calendar className="w-4 h-4" />
          Schedule {scheduledCount} Post{scheduledCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
    </>
  );
}
