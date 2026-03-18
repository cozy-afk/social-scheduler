'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Film, Zap, X, Check, Pencil, Image, BookOpen, FileText,
  Layers, Link2, Unlink2,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { GalleryAsset, PostType, Platform, TimeSlot } from '@/types/models';
import { addDays, format, startOfDay } from 'date-fns';
import { PLATFORM_THEMES } from '@/lib/constants/platform';
import ImageEditor, { ImageEditorResult } from '@/components/ImageEditor';
import { generateSmartSlots, formatTimezone } from '@/lib/utils/smartSchedule';

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

// A carousel group — multiple images that schedule together as one carousel post
interface AssetGroup {
  id: string;
  label: string;
  assetIds: string[]; // ordered image IDs
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

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onDragStart,
  usageCount,
  isSelected,
  onToggleSelect,
  groupingMode,
  inPendingGroup,
}: {
  asset: GalleryAsset;
  onDragStart: () => void;
  usageCount: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  groupingMode?: boolean;
  inPendingGroup?: boolean;
}) {
  const isVideo = asset.fileType === 'video';
  const canGroup = groupingMode && !isVideo;

  return (
    <div
      draggable={isSelected && !groupingMode}
      onDragStart={isSelected && !groupingMode ? onDragStart : undefined}
      onClick={onToggleSelect}
      className={`card p-3 flex items-center gap-3 cursor-pointer transition-all ${
        inPendingGroup
          ? 'border-amber-500/60 bg-amber-500/08'
          : isSelected
          ? 'border-violet-500/50 bg-violet-500/05'
          : groupingMode && !canGroup
          ? 'opacity-30 cursor-not-allowed'
          : 'hover:border-white/20 opacity-60'
      }`}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative"
        style={{ background: 'var(--bg-elevated)' }}>
        {!isVideo && asset.fileUrl ? (
          <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Film className="w-4 h-4 m-2.5" style={{ color: 'var(--text-muted)' }} />
        )}
        {isSelected && !groupingMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-violet-600/60">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
        {inPendingGroup && (
          <div className="absolute inset-0 flex items-center justify-center bg-amber-500/60">
            <Link2 className="w-4 h-4 text-white" />
          </div>
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

// ─── Carousel Group Card ──────────────────────────────────────────────────────

function GroupCard({
  group,
  assets,
  onDragStart,
  usageCount,
  onUnlink,
}: {
  group: AssetGroup;
  assets: GalleryAsset[];
  onDragStart: () => void;
  usageCount: number;
  onUnlink: () => void;
}) {
  const imgs = group.assetIds.map(id => assets.find(a => a.id === id)).filter(Boolean) as GalleryAsset[];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="card p-3 border-amber-500/40 bg-amber-500/05 cursor-grab active:cursor-grabbing transition-all hover:border-amber-500/60"
    >
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-300 flex-1 truncate">{group.label}</span>
        {usageCount > 0 && (
          <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded">
            ×{usageCount}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onUnlink(); }}
          className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
          title="Unlink group"
        >
          <Unlink2 className="w-3 h-3" />
        </button>
      </div>
      <div className="flex gap-1">
        {imgs.slice(0, 4).map((a, i) => (
          <div key={a.id} className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 relative"
            style={{ background: 'var(--bg-elevated)' }}>
            <img src={a.fileUrl} alt="" className="w-full h-full object-cover" />
            {i === 3 && imgs.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                +{imgs.length - 3}
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center ml-1">
          <span className="text-[10px] text-zinc-500">{imgs.length} images → Carousel</span>
        </div>
      </div>
    </div>
  );
}

// ─── Slot Card ────────────────────────────────────────────────────────────────

function SlotCard({
  slot,
  asset,
  group,
  groupAssets,
  editResult,
  isDragOver,
  isDragIncompat,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
  onEdit,
}: {
  slot: ScheduleSlot;
  asset: GalleryAsset | undefined;
  group: AssetGroup | undefined;
  groupAssets: GalleryAsset[];
  editResult?: ImageEditorResult;
  isDragOver: boolean;
  isDragIncompat: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const theme = PLATFORM_THEMES[slot.platform];
  const renderedUrl = editResult?.url?.startsWith('data:') ? editResult.url : undefined;
  const hasContent = !!(asset || group);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-xl p-3 border transition-all min-h-[72px] ${
        isDragIncompat
          ? 'border-red-500/50'
          : isDragOver
          ? 'border-violet-500/60'
          : hasContent
          ? 'border-green-500/20'
          : 'border-dashed border-white/10 hover:border-white/20'
      }`}
      style={{
        background: isDragIncompat
          ? 'rgba(239,68,68,0.04)'
          : isDragOver
          ? 'rgba(124,58,237,0.08)'
          : hasContent
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
      ) : group ? (
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {groupAssets.slice(0, 3).map(a => (
              <div key={a.id} className="w-7 h-7 rounded overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                <img src={a.fileUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {groupAssets.length > 3 && (
              <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0 bg-amber-500/20 flex items-center justify-center text-[9px] font-bold text-amber-300">
                +{groupAssets.length - 3}
              </div>
            )}
          </div>
          <p className="text-[11px] text-amber-300 truncate flex-1">{group.label}</p>
          <button onClick={onRemove} className="p-1 text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : asset ? (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ background: 'var(--bg-elevated)' }}>
            {asset.fileType === 'image' && asset.fileUrl ? (
              <img src={renderedUrl ?? asset.fileUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Film className="w-4 h-4 m-auto mt-2" style={{ color: 'var(--text-muted)' }} />
            )}
            {editResult && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-tl-md flex items-center justify-center"
                style={{ background: 'var(--accent-violet)' }}
                title={`Filter: ${editResult.filters?.namedFilter || 'Custom'}`}>
                <Pencil className="w-1.5 h-1.5 text-white" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-zinc-300 truncate flex-1">{asset.fileName}</p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={onEdit} className="p-1 text-zinc-600 hover:text-violet-400 transition-colors" title="Edit">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={onRemove} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {isDragOver
            ? 'Drop here'
            : slot.contentType === 'reel' || slot.contentType === 'story'
            ? 'Drop video here'
            : slot.contentType === 'carousel'
            ? 'Drop image(s) or group here'
            : 'Drop asset here'}
        </p>
      )}
    </div>
  );
}

// ─── Main BatchScheduler ──────────────────────────────────────────────────────

export default function BatchScheduler() {
  const router = useRouter();
  const { galleryAssets, stagedAssets, setWorkflowStep, addPost, selectedModelId, models } = useStore();
  const selectedModel = models.find((m) => m.id === selectedModelId);

  // Initialize selected assets from stagedAssets (pre-populated from gallery page)
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    () => new Set(stagedAssets.filter((sa) => !sa.skipped).map((sa) => sa.asset.id))
  );

  // Re-sync when stagedAssets changes (e.g. navigation from gallery)
  useEffect(() => {
    const ids = stagedAssets.filter((sa) => !sa.skipped).map((sa) => sa.asset.id);
    if (ids.length > 0) setSelectedAssetIds(new Set(ids));
  }, [stagedAssets]);

  // Assets available for drag+drop = selected gallery assets
  const assets = useMemo(
    () => galleryAssets.filter((a) => selectedAssetIds.has(a.id)),
    [galleryAssets, selectedAssetIds]
  );

  // ─── Carousel groups ────────────────────────────────────────────────────────
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [groupingMode, setGroupingMode] = useState(false);
  const [pendingGroupIds, setPendingGroupIds] = useState<Set<string>>(new Set());

  const handleTogglePendingGroup = useCallback((id: string) => {
    const asset = galleryAssets.find(a => a.id === id);
    if (!asset || asset.fileType !== 'image') return; // only images can be grouped
    setPendingGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [galleryAssets]);

  const confirmGroup = useCallback(() => {
    if (pendingGroupIds.size < 2) return;
    const ids = [...pendingGroupIds];
    const label = `Carousel ${assetGroups.length + 1}`;
    setAssetGroups(prev => [...prev, { id: `grp-${Date.now()}`, label, assetIds: ids }]);
    // Auto-select all grouped assets
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    setPendingGroupIds(new Set());
    setGroupingMode(false);
  }, [pendingGroupIds, assetGroups.length]);

  const unlinkGroup = useCallback((groupId: string) => {
    setAssetGroups(prev => prev.filter(g => g.id !== groupId));
    // Remove group from any slot assignments
    setSlotAssignments(prev => {
      const next = { ...prev };
      for (const [slotId, val] of Object.entries(next)) {
        if (val === groupId) delete next[slotId];
      }
      return next;
    });
  }, []);

  const modelTimezone = selectedModel?.timezone ?? 'America/New_York';

  // Build upcoming slots for next 14 days
  const slots = useMemo<ScheduleSlot[]>(() => {
    if (!selectedModel) return [];

    if (selectedModel.postingSchedule.length > 0) {
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

    return generateSmartSlots(['instagram', 'tiktok'], modelTimezone).map((s) => ({
      id: s.id,
      date: s.date,
      time: s.time,
      platform: s.platform,
      postType: s.platform === 'tiktok' ? 'tiktok_reel' : 'instagram_reel' as PostType,
      contentType: 'reel' as ContentType,
      assetId: null,
    }));
  }, [selectedModel, modelTimezone]);

  // slotId → assetId OR groupId
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({});
  const [dragItem, setDragItem] = useState<string | null>(null); // assetId or groupId
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editResults, setEditResults] = useState<Record<string, ImageEditorResult>>({});
  const [resizingSlotId, setResizingSlotId] = useState<string | null>(null);

  // Resizable left panel
  const [panelWidth, setPanelWidth] = useState(272);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      setPanelWidth(Math.max(180, Math.min(480, startWidth.current + (ev.clientX - startX.current))));
    };
    const onUp = () => {
      isResizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  const assetUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const val of Object.values(slotAssignments)) {
      counts[val] = (counts[val] ?? 0) + 1;
    }
    return counts;
  }, [slotAssignments]);

  // Is the currently-dragged item incompatible with a given slot?
  const isDragIncompat = useCallback((slot: ScheduleSlot) => {
    if (!dragItem) return false;
    const group = assetGroups.find(g => g.id === dragItem);
    if (group) {
      // Groups are only compatible with carousel slots
      return slot.contentType !== 'carousel';
    }
    const asset = assets.find((a) => a.id === dragItem);
    if (!asset) return false;
    const isVideo = asset.fileType === 'video';
    const isImage = asset.fileType === 'image';
    if (isVideo && slot.contentType === 'carousel') return true;
    if (isImage && (slot.contentType === 'reel' || slot.contentType === 'story')) return true;
    return false;
  }, [dragItem, assets, assetGroups]);

  // Auto-fill: Videos → IG/TikTok reel/story only. Images → carousel/post.
  // Groups → carousel slots only.
  const handleAutoFill = useCallback(() => {
    const emptySlots = slots.filter((s) => !slotAssignments[s.id]);
    const newAssignments: Record<string, string> = { ...slotAssignments };

    const videoAssets = assets.filter((a) => a.fileType === 'video');
    const imageAssets = assets.filter((a) => a.fileType === 'image');
    // Assets that are in groups should not be auto-filled individually
    const groupedIds = new Set(assetGroups.flatMap(g => g.assetIds));
    const freeImageAssets = imageAssets.filter(a => !groupedIds.has(a.id));

    // Group slots by date+time to cross-post same asset simultaneously
    const timeGroups: Record<string, ScheduleSlot[]> = {};
    for (const slot of emptySlots) {
      const key = `${slot.date}-${slot.time}`;
      if (!timeGroups[key]) timeGroups[key] = [];
      timeGroups[key].push(slot);
    }

    let videoIdx = 0;
    let imageIdx = 0;
    let groupIdx = 0;

    for (const group of Object.values(timeGroups)) {
      const videoAsset = videoIdx < videoAssets.length ? videoAssets[videoIdx] : undefined;
      const imageAsset = imageIdx < freeImageAssets.length ? freeImageAssets[imageIdx] : undefined;
      const assetGroup = groupIdx < assetGroups.length ? assetGroups[groupIdx] : undefined;

      let usedVideo = false;
      let usedImage = false;
      let usedGroup = false;

      for (const slot of group) {
        // Videos: ONLY Instagram and TikTok reel/story slots
        const isVideoFriendlyPlatform = slot.platform === 'instagram' || slot.platform === 'tiktok';

        if ((slot.contentType === 'reel' || slot.contentType === 'story') && isVideoFriendlyPlatform) {
          if (videoAsset) {
            newAssignments[slot.id] = videoAsset.id;
            usedVideo = true;
          }
        } else if (slot.contentType === 'carousel') {
          // Prefer groups for carousel slots, fallback to single image
          if (assetGroup && !usedGroup) {
            newAssignments[slot.id] = assetGroup.id;
            usedGroup = true;
          } else if (imageAsset) {
            newAssignments[slot.id] = imageAsset.id;
            usedImage = true;
          }
        } else if (slot.contentType === 'post') {
          // Post slots: images preferred; videos only on IG/TikTok
          if (imageAsset) {
            newAssignments[slot.id] = imageAsset.id;
            usedImage = true;
          } else if (videoAsset && isVideoFriendlyPlatform) {
            newAssignments[slot.id] = videoAsset.id;
            usedVideo = true;
          }
        }
      }

      if (usedVideo) videoIdx++;
      if (usedImage) imageIdx++;
      if (usedGroup) groupIdx++;
    }

    setSlotAssignments(newAssignments);
  }, [assets, assetGroups, slots, slotAssignments]);

  const handleDrop = useCallback((slotId: string) => {
    if (!dragItem) return;
    const slot = slots.find((s) => s.id === slotId);
    if (slot) {
      const group = assetGroups.find(g => g.id === dragItem);
      if (group && slot.contentType !== 'carousel') { setDragItem(null); setDragOverSlotId(null); return; }
      const asset = assets.find((a) => a.id === dragItem);
      if (asset) {
        const isVideo = asset.fileType === 'video';
        const isImage = asset.fileType === 'image';
        if (isVideo && slot.contentType === 'carousel') { setDragItem(null); setDragOverSlotId(null); return; }
        if (isImage && (slot.contentType === 'reel' || slot.contentType === 'story')) { setDragItem(null); setDragOverSlotId(null); return; }
      }
    }
    setSlotAssignments((prev) => ({ ...prev, [slotId]: dragItem }));
    setDragItem(null);
    setDragOverSlotId(null);
  }, [dragItem, slots, assets, assetGroups]);

  const handleRemoveFromSlot = useCallback((slotId: string) => {
    setSlotAssignments((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }, []);

  const handleSaveEdit = useCallback((result: ImageEditorResult) => {
    const targetSlotId = editingSlotId ?? resizingSlotId;
    if (!targetSlotId) return;
    setEditResults((prev) => ({ ...prev, [targetSlotId]: result }));
    setEditingSlotId(null);
    setResizingSlotId(null);
  }, [editingSlotId, resizingSlotId]);

  const scheduledCount = Object.keys(slotAssignments).length;
  const uniqueItemsUsed = new Set(Object.values(slotAssignments)).size;

  const handleSchedule = useCallback(() => {
    for (const [slotId, itemId] of Object.entries(slotAssignments)) {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) continue;

      // Check if this is a group
      const group = assetGroups.find(g => g.id === itemId);
      if (group) {
        const groupAssets = group.assetIds
          .map(id => galleryAssets.find(a => a.id === id))
          .filter(Boolean) as GalleryAsset[];
        addPost({
          id: `post-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          modelId: selectedModelId || 'default',
          platform: slot.platform,
          postType: slot.postType,
          scheduledTime: `${slot.date}T${slot.time}:00`,
          status: 'scheduled',
          description: '',
          imageCaption: '',
          assets: groupAssets.map((a, i) => ({
            id: `asset-${Date.now()}-${i}`,
            postId: '',
            fileUrl: a.fileUrl,
            fileName: a.fileName,
            fileType: a.fileType,
            order: i + 1,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      // Single asset
      const asset = galleryAssets.find((a) => a.id === itemId);
      if (!asset) continue;
      const editedUrl = editResults[slotId]?.url;
      const finalFileUrl = (editedUrl?.startsWith('data:') ? editedUrl : null) ?? asset.fileUrl;
      addPost({
        id: `post-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        modelId: selectedModelId || 'default',
        platform: slot.platform,
        postType: slot.postType,
        scheduledTime: `${slot.date}T${slot.time}:00`,
        status: 'scheduled',
        description: '',
        imageCaption: '',
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
    setWorkflowStep('gallery');
    router.push('/gallery');
  }, [slotAssignments, slots, assets, galleryAssets, assetGroups, addPost, selectedModelId, setWorkflowStep, router, editResults]);

  // Group slots by date
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
    ? galleryAssets.find((a) => a.id === slotAssignments[activeEditorSlotId])
    : null;

  return (
    <>
      {/* Image Editor overlay */}
      {activeEditorAsset && activeEditorSlotId && (
        <ImageEditor
          item={{
            id: activeEditorAsset.id,
            url: editResults[activeEditorSlotId]?.url?.startsWith('data:')
              ? editResults[activeEditorSlotId].url
              : activeEditorAsset.fileUrl,
            name: activeEditorAsset.fileName,
            type: activeEditorAsset.fileType,
          }}
          initialFilters={editResults[activeEditorSlotId]?.filters}
          initialOverlays={editResults[activeEditorSlotId]?.overlays}
          onDone={handleSaveEdit}
          onCancel={() => { setEditingSlotId(null); setResizingSlotId(null); }}
        />
      )}

      <div className="h-full flex flex-col" style={{ background: 'var(--bg-app)' }}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: 'var(--bg-sidebar)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="page-title">Schedule Assets</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <Globe className="w-3 h-3 text-violet-400" />
                <p className="text-[10px] text-violet-300">{formatTimezone(modelTimezone)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!groupingMode ? (
              <>
                <button
                  onClick={() => setGroupingMode(true)}
                  className="btn-ghost text-xs flex items-center gap-1.5"
                  title="Link images together as a carousel group"
                >
                  <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  Link as Carousel
                </button>
                <button onClick={handleAutoFill} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-violet-400" />
                  Auto-fill
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-amber-300">
                  {pendingGroupIds.size < 2
                    ? `Select ${2 - pendingGroupIds.size} more image${pendingGroupIds.size === 1 ? '' : 's'} to link`
                    : `${pendingGroupIds.size} images selected`}
                </p>
                <button
                  onClick={confirmGroup}
                  disabled={pendingGroupIds.size < 2}
                  className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Link {pendingGroupIds.size} images
                </button>
                <button onClick={() => { setGroupingMode(false); setPendingGroupIds(new Set()); }}
                  className="btn-ghost text-xs">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Assets sidebar */}
          <div
            className="flex-shrink-0 border-r overflow-y-auto no-scrollbar p-4 flex flex-col gap-3"
            style={{ width: panelWidth, borderColor: 'rgba(255,255,255,0.06)', background: 'var(--bg-sidebar)' }}
          >
            <div className="flex items-center justify-between">
              <p className="section-title">Gallery ({galleryAssets.length})</p>
              <span className="text-[10px] text-violet-300">{assets.length} selected</span>
            </div>

            {groupingMode && (
              <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                Click image assets to add them to a carousel group. Videos cannot be grouped.
              </div>
            )}

            {galleryAssets.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No assets in gallery</p>
            ) : (
              galleryAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  usageCount={assetUsageCounts[asset.id] ?? 0}
                  isSelected={selectedAssetIds.has(asset.id)}
                  groupingMode={groupingMode}
                  inPendingGroup={pendingGroupIds.has(asset.id)}
                  onToggleSelect={() => {
                    if (groupingMode) {
                      handleTogglePendingGroup(asset.id);
                    } else {
                      setSelectedAssetIds(prev => {
                        const next = new Set(prev);
                        if (next.has(asset.id)) next.delete(asset.id);
                        else next.add(asset.id);
                        return next;
                      });
                    }
                  }}
                  onDragStart={() => setDragItem(asset.id)}
                />
              ))
            )}

            {/* Carousel groups */}
            {assetGroups.length > 0 && (
              <>
                <div className="border-t pt-3 mt-1" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="section-title mb-2">Carousel Groups</p>
                  {assetGroups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      assets={galleryAssets}
                      onDragStart={() => setDragItem(group.id)}
                      usageCount={assetUsageCounts[group.id] ?? 0}
                      onUnlink={() => unlinkGroup(group.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="w-1 flex-shrink-0 cursor-col-resize hover:bg-violet-500/40 transition-colors active:bg-violet-500/60"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          />

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
                        const itemId = slotAssignments[slot.id];
                        const group = itemId ? assetGroups.find(g => g.id === itemId) : undefined;
                        const asset = itemId && !group ? galleryAssets.find((a) => a.id === itemId) : undefined;
                        const groupAssets = group
                          ? group.assetIds.map(id => galleryAssets.find(a => a.id === id)).filter(Boolean) as GalleryAsset[]
                          : [];
                        return (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            asset={asset}
                            group={group}
                            groupAssets={groupAssets}
                            editResult={editResults[slot.id]}
                            isDragOver={dragOverSlotId === slot.id}
                            isDragIncompat={dragOverSlotId === slot.id && isDragIncompat(slot)}
                            onDragOver={(e) => { e.preventDefault(); setDragOverSlotId(slot.id); }}
                            onDragLeave={() => setDragOverSlotId(null)}
                            onDrop={() => handleDrop(slot.id)}
                            onRemove={() => handleRemoveFromSlot(slot.id)}
                            onEdit={() => { if (asset) setEditingSlotId(slot.id); }}
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
            {uniqueItemsUsed > 0 && ` · ${uniqueItemsUsed} item${uniqueItemsUsed !== 1 ? 's' : ''}`}
            {assetGroups.length > 0 && ` · ${assetGroups.length} group${assetGroups.length !== 1 ? 's' : ''}`}
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

// Needed for the Globe icon used in JSX
function Globe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
