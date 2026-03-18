'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useStore, getVisibleModels } from '@/lib/store';
import { mockModels, mockAdmin } from '@/lib/mockData';
import { AuthGuard } from '@/components/AuthGuard';
import CreatePostModal from '@/components/CreatePostModal';
import StagingView from '@/components/StagingView';
import ImageEditor, { EditableImage, ImageEditorResult } from '@/components/ImageEditor';
import BatchScheduler from '@/components/BatchScheduler';
import AutoPublisher from '@/components/AutoPublisher';
import FeedPreviewPanel from '@/components/FeedPreviewPanel';
import { GalleryAsset, CropRatio } from '@/types/models';
import { calculateViralityScore, type ViralityAnalysis } from '@/lib/virality-analyzer';
import { getCachedAssets, setCachedAssets, touchCachedAssets, fetchGalleryAssets } from '@/lib/gallery-cache';
import {
  Upload, Check, X, Film, Image as ImageIcon,
  HardDrive, Search, FolderOpen, Users,
  Eye, Loader2, RefreshCw, Heart, MessageCircle, Bookmark,
  Send, Play, Music2, Layers,
  Grid3X3, List, Rows3, CheckCheck, ThumbsUp, CalendarCheck,
  Share2, ChevronRight, Plus, Wifi, Signal, Battery,
  Sparkles, Copy, Zap, Star, Pencil, CalendarPlus,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRatio(ratio?: number): string {
  if (!ratio) return '—';
  if (Math.abs(ratio - 1.0) < 0.03) return '1:1 ✓';
  if (Math.abs(ratio - 0.8) < 0.03) return '4:5 ✓';
  if (Math.abs(ratio - 0.5625) < 0.03) return '9:16';
  return ratio.toFixed(2);
}

interface IGPost {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  caption?: string;
}

// ─── Video Thumbnail (lazy, intersection-based) ───────────────────────────────

/**
 * Renders a video first-frame preview.
 * The <video> element is only created once the thumbnail scrolls into the viewport,
 * so we never load video data for off-screen cells.
 */
function VideoThumbnail({ src, fileName }: { src: string; fileName: string }) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShouldLoad(true); observer.disconnect(); } },
      { rootMargin: '300px' } // start loading 300px before visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-800">
      {shouldLoad && (
        <video
          src={src}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          preload="metadata"
          muted
          playsInline
          onLoadedData={() => setLoaded(true)}
        />
      )}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            {shouldLoad
              ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              : <Film className="w-5 h-5 text-slate-300" />
            }
          </div>
          <p className="text-[10px] text-slate-500 text-center truncate w-full px-1 leading-tight">
            {fileName}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Video Lightbox ───────────────────────────────────────────────────────────

function VideoLightbox({ asset, onClose }: { asset: GalleryAsset; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          <X className="w-5 h-5" /> Close
        </button>
        <video
          src={asset.fileUrl}
          controls
          autoPlay
          className="w-full rounded-xl max-h-[80vh] bg-black"
          style={{ outline: 'none' }}
        />
        <p className="text-xs text-slate-400 mt-2 truncate">{asset.fileName}</p>
      </div>
    </div>
  );
}

// ─── Asset Thumbnail ──────────────────────────────────────────────────────────

function AssetThumbnail({
  asset,
  selected,
  approved,
  isPosted,
  onToggle,
  onApprove,
  onPreviewVideo,
  onEdit,
  showVirality,
  viralityAnalysis,
}: {
  asset: GalleryAsset;
  selected: boolean;
  approved: boolean;
  isPosted: boolean;
  onToggle: () => void;
  onApprove: (e: React.MouseEvent) => void;
  onPreviewVideo: (e: React.MouseEvent) => void;
  onEdit?: () => void;
  showVirality: boolean;
  viralityAnalysis?: ViralityAnalysis;
}) {
  const isOkRatio = asset.aspectRatio
    ? Math.abs(asset.aspectRatio - 1.0) < 0.03 || Math.abs(asset.aspectRatio - 0.8) < 0.03
    : true;

  return (
    <div
      onClick={onToggle}
      className={`relative group aspect-square cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-150 ${
        approved
          ? 'border-green-500 shadow-green-500/20 shadow-lg'
          : selected
          ? 'border-violet-500 shadow-violet-500/30 shadow-lg'
          : isPosted
          ? 'border-emerald-600/60 hover:border-emerald-500'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        {asset.fileType === 'video' ? (
          // VideoThumbnail loads the video lazily via IntersectionObserver,
          // only fetching metadata (first frame) once the cell is near the viewport.
          <VideoThumbnail src={asset.fileUrl} fileName={asset.fileName} />
        ) : asset.fileUrl ? (
          <img src={asset.fileUrl} alt={asset.fileName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-8 h-8 text-slate-600" />
        )}
      </div>

      {/* Posted overlay */}
      {isPosted && !selected && !approved && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Approved tint */}
      {approved && <div className="absolute inset-0 bg-green-500/10" />}

      <div className={`absolute inset-0 transition-all duration-150 ${selected ? 'bg-violet-500/20' : 'group-hover:bg-black/20'}`} />

      {/* Video play button — centered, opens lightbox */}
      {asset.fileType === 'video' && (
        <button
          onClick={onPreviewVideo}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Watch video"
        >
          <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center border border-white/20 hover:bg-black/90 transition-colors">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </button>
      )}

      {/* Virality score badge */}
      {showVirality && asset.fileType === 'image' && viralityAnalysis && (
        <div className={`absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold transition-opacity ${
          viralityAnalysis.score >= 80
            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white opacity-100'
            : viralityAnalysis.score >= 60
            ? 'bg-amber-500/90 text-white opacity-0 group-hover:opacity-100'
            : 'bg-slate-600/90 text-slate-300 opacity-0 group-hover:opacity-100'
        }`}>
          <Sparkles className="w-2.5 h-2.5" />
          {viralityAnalysis.score}
        </div>
      )}

      {/* Select checkbox */}
      <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        selected ? 'bg-violet-600 border-violet-500' : 'bg-black/60 border-white/30 opacity-0 group-hover:opacity-100'
      } ${asset.fileType === 'video' ? 'top-9' : ''}`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Quick approve button — top right (visible on hover, or always when approved) */}
      <button
        onClick={onApprove}
        title={approved ? 'Remove approval' : 'Approve for scheduling'}
        className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
          approved
            ? 'bg-green-500 opacity-100'
            : 'bg-black/60 opacity-0 group-hover:opacity-100 hover:bg-green-500/80'
        } ${showVirality && asset.fileType === 'image' && viralityAnalysis ? 'top-9' : ''}`}
      >
        <ThumbsUp className="w-3 h-3 text-white" />
      </button>

      {/* Posted badge */}
      {isPosted && !approved && (
        <div className="absolute bottom-8 right-1 flex items-center gap-0.5 bg-emerald-600/90 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
          <CheckCheck className="w-2.5 h-2.5" />
          Posted
        </div>
      )}

      {/* Approved badge */}
      {approved && (
        <div className="absolute bottom-8 right-1 flex items-center gap-0.5 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">
          <Check className="w-2.5 h-2.5" />
          Approved
        </div>
      )}

      {/* Variant badge */}
      {asset.variantOf && (
        <div className="absolute bottom-2 left-2 bg-blue-500/80 text-white text-[7px] px-1 py-0.5 rounded font-medium">
          {asset.variantLabel || 'Variant'}
        </div>
      )}

      <div className={`absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-medium ${
        isOkRatio ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
      }`}>
        {formatRatio(asset.aspectRatio)}
      </div>

      {/* Edit button — only for images */}
      {onEdit && asset.fileType === 'image' && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Edit photo"
          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-violet-600/90 hover:border-violet-400 z-10"
        >
          <Pencil className="w-3.5 h-3.5 text-white" />
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-2 translate-y-full group-hover:translate-y-0 transition-transform">
        <p className="text-[10px] text-slate-200 truncate">{asset.fileName}</p>
        {asset.sizeBytes && <p className="text-[9px] text-slate-400">{formatBytes(asset.sizeBytes)}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const {
    selectedModelId, setModels, setSelectedModelId, setCurrentUser,
    galleryAssets, setGalleryAssets, addGalleryAsset,
    setShowCreatePostModal, setPreloadedGalleryAssets, showCreatePostModal,
    setStagedAssets, workflowStep, editingTarget, setEditingTarget,
    updateStagedVariant, setWorkflowStep, stagedAssets, posts,
  } = useStore();
  const models = useStore(getVisibleModels); // Filtered by user role/agency

  // Build a set of fileUrls that have been used in completed posts
  const postedUrlSet = useMemo(() => {
    const set = new Set<string>();
    for (const post of posts) {
      if (post.status === 'completed') {
        for (const asset of post.assets) {
          if (asset.fileUrl) set.add(asset.fileUrl);
        }
      }
    }
    return set;
  }, [posts]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { approvedAssetIds, approveAsset, unapproveAsset, clearApprovals } = useStore();
  const approvedIds = new Set(approvedAssetIds);
  const [assetFilter, setAssetFilter] = useState<'all' | 'image' | 'video'>('all');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(50);
  const [page, setPage] = useState(1);
  const [previewVideo, setPreviewVideo] = useState<GalleryAsset | null>(null);
  const [showFeedPreview, setShowFeedPreview] = useState(false);
  const [galleryEditingAsset, setGalleryEditingAsset] = useState<GalleryAsset | null>(null);
  const [postEditVariant, setPostEditVariant] = useState<GalleryAsset | null>(null);
  const [thumbSize, setThumbSize] = useState(3);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0); // counts nested dragenter/dragleave events
  const [isDragOver, setIsDragOver] = useState(false);

  // Per-file upload progress: key = fileName, value = 0-100 | 'done' | 'error'
  const [uploadQueue, setUploadQueue] = useState<Map<string, number | 'done' | 'error'>>(new Map());

  const [r2Loading, setR2Loading] = useState(false);
  const [r2Refreshing, setR2Refreshing] = useState(false);
  const [r2Error, setR2Error] = useState<string | null>(null);

  // Virality analysis state
  const [showVirality, setShowVirality] = useState(true);
  const [analyzingVirality, setAnalyzingVirality] = useState<Set<string>>(new Set());
  const [viralityCache, setViralityCache] = useState<Map<string, ViralityAnalysis>>(new Map());

  useEffect(() => {
    setModels(mockModels);
    // Do NOT auto-select a model — user picks from the sidebar dropdown
    setCurrentUser(mockAdmin);
  }, [setModels, setCurrentUser]);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  // Auto-load gallery when the selected model changes (stale-while-revalidate)
  useEffect(() => {
    // Always clear the previous model's assets immediately so the old gallery
    // never stays on screen while the new one is loading.
    setGalleryAssets([]);
    setSelectedIds(new Set());
    clearApprovals();
    setR2Error(null);
    setR2Refreshing(false);
    setR2Loading(false);
    setPage(1);

    if (!selectedModel?.s3Folder) return; // no R2 folder configured — show empty gallery

    let cancelled = false;

    const cached = getCachedAssets(selectedModel.id);

    if (cached) {
      // Show cached assets immediately — no loading flash
      setGalleryAssets(cached.assets);

      if (cached.status === 'stale') {
        // Refresh in the background; user keeps seeing stale content
        setR2Refreshing(true);
        fetchGalleryAssets(selectedModel.s3Folder, cached.etag)
          .then(({ assets, etag, notModified }) => {
            if (cancelled) return;
            if (!notModified) {
              setCachedAssets(selectedModel.id, assets, etag);
              setGalleryAssets(assets);
            } else {
              touchCachedAssets(selectedModel.id);
            }
          })
          .catch(() => {})
          .finally(() => { if (!cancelled) setR2Refreshing(false); });
      }
    } else {
      // Cache miss — full load with spinner
      setR2Loading(true);
      fetchGalleryAssets(selectedModel.s3Folder, null)
        .then(({ assets, etag }) => {
          if (cancelled) return;
          setCachedAssets(selectedModel.id, assets, etag);
          setGalleryAssets(assets);
        })
        .catch((err) => { if (!cancelled) setR2Error(err instanceof Error ? err.message : 'Unknown error'); })
        .finally(() => { if (!cancelled) setR2Loading(false); });
    }

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId]);

  // Manual refresh — bypass cache
  const loadFromR2 = useCallback(async () => {
    if (!selectedModel?.s3Folder) return;
    setR2Loading(true);
    setR2Error(null);
    try {
      const { assets, etag } = await fetchGalleryAssets(selectedModel.s3Folder, null);
      setCachedAssets(selectedModel.id, assets, etag);
      setGalleryAssets(assets);
    } catch (err) {
      setR2Error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setR2Loading(false);
    }
  }, [selectedModel, setGalleryAssets]);

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!selectedModel?.s3Folder) {
      setR2Error('No R2 folder configured for this model. Set one in Settings → Model → General.');
      return;
    }
    uploadFilesToR2(files);
  };

  /** Upload files directly to R2 via presigned PUT URLs, showing per-file progress. */
  const uploadFilesToR2 = useCallback(async (files: File[]) => {
    if (!selectedModel?.s3Folder) return;
    const folder = selectedModel.s3Folder;

    const queue = new Map<string, number | 'done' | 'error'>();
    files.forEach((f) => queue.set(f.name, 0));
    setUploadQueue(new Map(queue));

    await Promise.all(files.map(async (file) => {
      const key = file.name; // used only as queue identifier
      try {
        // 1. Get presigned PUT URL
        const res = await fetch('/api/r2/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelFolder: folder, fileName: file.name, contentType: file.type }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const { uploadUrl, key: r2Key, uuid } = await res.json() as { uploadUrl: string; key: string; uuid: string };

        // 2. PUT directly to R2 with XHR so we get upload progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadQueue((prev) => new Map(prev).set(key, Math.round((e.loaded / e.total) * 100)));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`R2 PUT failed: ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(file);
        });

        // 3. Add to gallery immediately with a thumb-proxy URL
        const thumbUrl = `/api/r2/thumb?key=${encodeURIComponent(r2Key)}`;
        addGalleryAsset({
          id: uuid,
          fileName: file.name,
          fileUrl: thumbUrl,
          thumbnailUrl: file.type.startsWith('image/') ? thumbUrl : undefined,
          fileType: file.type.startsWith('video/') ? 'video' : 'image',
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          source: 's3',
          s3Key: r2Key,
        });

        setUploadQueue((prev) => new Map(prev).set(key, 'done'));
      } catch {
        setUploadQueue((prev) => new Map(prev).set(key, 'error'));
      }
    }));

    // Invalidate the cache so the next gallery load fetches the new assets
    const { invalidateCache } = await import('@/lib/gallery-cache');
    invalidateCache(selectedModel.id);

    // Clear the queue after a short delay so the user sees all ✓s
    setTimeout(() => setUploadQueue(new Map()), 2500);
  }, [selectedModel, addGalleryAsset]);

  // ── Drag-and-drop handlers ────────────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // required to allow drop
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/'),
    );
    if (files.length === 0) return;

    if (!selectedModel?.s3Folder) {
      setR2Error('No R2 folder configured for this model. Set one in Settings → Model → General.');
      return;
    }
    uploadFilesToR2(files);
  }, [selectedModel, uploadFilesToR2, setR2Error]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((a) => a.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleStageSelected = () => {
    const selected = galleryAssets.filter((a) => selectedIds.has(a.id));
    setStagedAssets(selected);
    clearSelection();
  };

  const toggleApprove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    approvedIds.has(id) ? unapproveAsset(id) : approveAsset(id);
  };

  const handleScheduleApproved = () => {
    const approved = galleryAssets.filter((a) => approvedIds.has(a.id));
    if (approved.length === 0) return;
    setStagedAssets(approved);
    // Override workflowStep to skip staging and go straight to scheduling
    setWorkflowStep('scheduling');
  };

  const handleEditVariant = useCallback((assetId: string, ratio: CropRatio) => {
    setEditingTarget({ assetId, ratio });
    setWorkflowStep('editing');
  }, [setEditingTarget, setWorkflowStep]);

  // Virality analysis
  const analyzeVirality = useCallback(async (asset: GalleryAsset) => {
    if (analyzingVirality.has(asset.id) || viralityCache.has(asset.id)) {
      return;
    }

    setAnalyzingVirality((prev) => new Set(prev).add(asset.id));

    try {
      const analysis = await calculateViralityScore(asset);
      setViralityCache((prev) => new Map(prev).set(asset.id, analysis));

      // Update asset with virality score
      setGalleryAssets(
        galleryAssets.map((a) =>
          a.id === asset.id ? { ...a, viralityScore: analysis.score } : a
        )
      );
    } catch (error) {
      console.error('Virality analysis failed:', error);
    } finally {
      setAnalyzingVirality((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  }, [analyzingVirality, viralityCache, galleryAssets, setGalleryAssets]);

  // Create variant of an asset
  const createVariant = useCallback((originalAsset: GalleryAsset, variantLabel: string) => {
    const variant: GalleryAsset = {
      ...originalAsset,
      id: `${originalAsset.id}-variant-${Date.now()}`,
      fileName: `${originalAsset.fileName} (${variantLabel})`,
      variantOf: originalAsset.id,
      variantLabel,
      favorite: false,
      // Clear virality score for variant (will be recalculated if needed)
      viralityScore: undefined,
    };

    addGalleryAsset(variant);
    return variant;
  }, [addGalleryAsset]);

  // Create edited variant from staging
  const createEditedVariant = useCallback(async (
    originalAsset: GalleryAsset,
    editedUrl: string,
    variantLabel: string = 'edited'
  ) => {
    const variant: GalleryAsset = {
      ...originalAsset,
      id: `${originalAsset.id}-variant-${Date.now()}`,
      fileName: `${originalAsset.fileName} (${variantLabel})`,
      fileUrl: editedUrl,
      thumbnailUrl: editedUrl, // Use edited URL as thumbnail too
      variantOf: originalAsset.id,
      variantLabel,
      favorite: false,
      viralityScore: undefined,
    };

    addGalleryAsset(variant);

    // Analyze virality for the new variant if it's an image
    if (variant.fileType === 'image') {
      setTimeout(() => analyzeVirality(variant), 500);
    }

    return variant;
  }, [addGalleryAsset, analyzeVirality]);

  const handleEditorDone = useCallback(async (result: ImageEditorResult) => {
    if (!editingTarget) return;

    // Find the original asset
    const originalAsset = galleryAssets.find((a) => a.id === editingTarget.assetId);
    if (!originalAsset) {
      updateStagedVariant(editingTarget.assetId, editingTarget.ratio, {
        url: result.url,
        namedFilter: result.filters.namedFilter,
        filters: result.filters as unknown as Record<string, number>,
        overlays: result.overlays,
      });
      setEditingTarget(null);
      setWorkflowStep('staging');
      return;
    }

    // Only create a variant if actual edits were made (compare against defaults)
    const f = result.filters;
    const isDefaultFilters = f.brightness === 100 && f.contrast === 100 && f.saturation === 100 &&
      f.warmth === 0 && f.vignette === 0 && f.fade === 0 && f.sharpen === 0 && !f.namedFilter;
    const hasEdits = !isDefaultFilters || (result.overlays && result.overlays.length > 0);

    if (hasEdits) {
      // Create a new variant with the edited version
      await createEditedVariant(originalAsset, result.url, 'edited');
    }

    // Update the staged variant with the edited URL
    updateStagedVariant(editingTarget.assetId, editingTarget.ratio, {
      url: result.url,
      namedFilter: result.filters.namedFilter,
      filters: result.filters as unknown as Record<string, number>,
      overlays: result.overlays,
    });
    setEditingTarget(null);
    setWorkflowStep('staging');
  }, [editingTarget, updateStagedVariant, setEditingTarget, setWorkflowStep, galleryAssets, createEditedVariant]);

  const handleEditorCancel = useCallback(() => {
    setEditingTarget(null);
    setWorkflowStep('staging');
  }, [setEditingTarget, setWorkflowStep]);

  // Direct edit from gallery (no staging required)
  const handleGalleryEditorDone = useCallback(async (result: ImageEditorResult) => {
    if (!galleryEditingAsset) return;
    const f = result.filters;
    const isDefaultFilters = f.brightness === 100 && f.contrast === 100 && f.saturation === 100 &&
      f.warmth === 0 && f.vignette === 0 && f.fade === 0 && f.sharpen === 0 && !f.namedFilter;
    const hasEdits = !isDefaultFilters || (result.overlays && result.overlays.length > 0);
    if (hasEdits) {
      const variant = await createEditedVariant(galleryEditingAsset, result.url, 'edited');
      setPostEditVariant(variant);
    }
    setGalleryEditingAsset(null);
  }, [galleryEditingAsset, createEditedVariant]);

  // Analyze virality for all images
  const analyzeAllVirality = useCallback(async () => {
    const imageAssets = galleryAssets.filter((a) => a.fileType === 'image');
    for (const asset of imageAssets) {
      await analyzeVirality(asset);
    }
  }, [galleryAssets, analyzeVirality]);

  // Auto-analyze virality on mount (with delay)
  useEffect(() => {
    if (showVirality && galleryAssets.length > 0) {
      const timer = setTimeout(() => {
        analyzeAllVirality();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showVirality, galleryAssets, analyzeAllVirality]);

  const filtered = useMemo(() => {
    setPage(1); // reset to first page whenever the filter set changes
    return galleryAssets.filter((a) => {
      if (assetFilter === 'image' && a.fileType !== 'image') return false;
      if (assetFilter === 'video' && a.fileType !== 'video') return false;
      if (search) {
        const term = search.toLowerCase();
        const dateStr = a.uploadedAt
          ? new Date(a.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toLowerCase()
          : '';
        const matches =
          a.fileName.toLowerCase().includes(term) ||
          a.fileType.toLowerCase().includes(term) ||
          formatRatio(a.aspectRatio).toLowerCase().includes(term) ||
          dateStr.includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [galleryAssets, assetFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  // Auto-trigger virality analysis for images on the current page
  useEffect(() => {
    if (showVirality) {
      paginated.forEach((asset) => {
        if (asset.fileType === 'image' && !viralityCache.has(asset.id)) {
          analyzeVirality(asset);
        }
      });
    }
  }, [paginated, showVirality, viralityCache, analyzeVirality]);

  const imageCount = galleryAssets.filter((a) => a.fileType === 'image').length;
  const videoCount = galleryAssets.filter((a) => a.fileType === 'video').length;
  const postedCount = galleryAssets.filter((a) => postedUrlSet.has(a.fileUrl)).length;
  const arIssues = galleryAssets.filter((a) => {
    if (!a.aspectRatio || a.fileType === 'video') return false;
    return Math.abs(a.aspectRatio - 1.0) > 0.03 && Math.abs(a.aspectRatio - 0.8) > 0.03;
  }).length;

  const selectedAssets = galleryAssets.filter((a) => selectedIds.has(a.id));

  return (
    <AuthGuard>
      <div
        className="min-h-screen relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
      {/* ── Drag-over overlay ── */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
          style={{ background: 'rgba(124,58,237,0.15)', border: '3px dashed rgba(124,58,237,0.7)' }}>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.3)' }}>
              <Upload className="w-10 h-10 text-violet-300" />
            </div>
            <p className="text-2xl font-bold text-violet-200">Drop to upload</p>
            <p className="text-sm text-violet-300/70">
              {selectedModel?.s3Folder
                ? `Uploading to [MODELS]/${selectedModel.s3Folder}/`
                : 'No R2 folder configured — configure one in Settings first'}
            </p>
          </div>
        </div>
      )}

      {/* ── Upload progress panel ── */}
      {uploadQueue.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: '#1A1A22', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Uploading {uploadQueue.size} file{uploadQueue.size !== 1 ? 's' : ''}</span>
            {Array.from(uploadQueue.values()).every((v) => v === 'done' || v === 'error') && (
              <button onClick={() => setUploadQueue(new Map())} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
            {Array.from(uploadQueue.entries()).map(([name, progress]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300 truncate max-w-[180px]">{name}</span>
                  <span className="text-xs font-medium ml-2 flex-shrink-0">
                    {progress === 'done' ? <Check className="w-3.5 h-3.5 text-green-400" /> :
                     progress === 'error' ? <X className="w-3.5 h-3.5 text-red-400" /> :
                     <span className="text-slate-400">{progress}%</span>}
                  </span>
                </div>
                {typeof progress === 'number' && (
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full bg-violet-500 transition-all duration-150"
                      style={{ width: `${progress}%` }} />
                  </div>
                )}
                {progress === 'done' && (
                  <div className="h-1 rounded-full bg-green-500" />
                )}
                {progress === 'error' && (
                  <div className="h-1 rounded-full bg-red-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <AutoPublisher />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className={`flex gap-6 ${showFeedPreview ? 'lg:flex-row flex-col' : 'flex-col'}`}>
          {/* Left: gallery content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Content Gallery</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {filtered.length} assets · {imageCount} images · {videoCount} videos
                  {filtered.length !== galleryAssets.length && <span className="text-slate-500 ml-1">(filtered from {galleryAssets.length})</span>}
                  {postedCount > 0 && <span className="text-emerald-400 ml-2">· {postedCount} already posted</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFeedPreview(!showFeedPreview)}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all ${
                    showFeedPreview
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'btn-secondary'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Feed Preview
                </button>
                <button
                  onClick={() => setShowVirality(!showVirality)}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all ${
                    showVirality
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 border-violet-500 text-white'
                      : 'btn-secondary'
                  }`}
                  title="Show/hide virality scores"
                >
                  <Sparkles className="w-4 h-4" />
                  Virality
                </button>
                <button
                  onClick={loadFromR2}
                  disabled={r2Loading || !selectedModel?.s3Folder}
                  className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40"
                  title={selectedModel?.s3Folder ? `Refresh from vault-storage/[MODELS]/${selectedModel.s3Folder}/` : 'No R2 folder configured'}
                >
                  {r2Loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className={`w-4 h-4 ${r2Refreshing ? 'animate-spin text-violet-400' : ''}`} />}
                  {r2Loading ? 'Loading…' : 'Refresh'}
                </button>
                {r2Error && (
                  <span className="text-xs text-red-400 max-w-xs truncate" title={r2Error}>{r2Error}</span>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleLocalUpload} className="hidden" />
                {/* View mode toggle */}
                <div className="flex items-center gap-0.5 bg-slate-800 border border-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Background-refresh indicator */}
            {r2Refreshing && (
              <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full bg-violet-500 animate-pulse" style={{ width: '100%' }} />
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Assets', value: galleryAssets.length, color: 'text-slate-200', icon: <FolderOpen className="w-4 h-4" /> },
                { label: 'Images', value: imageCount, color: 'text-pink-400', icon: <ImageIcon className="w-4 h-4" /> },
                { label: 'Videos', value: videoCount, color: 'text-red-400', icon: <Film className="w-4 h-4" /> },
                { label: 'Already Posted', value: postedCount, color: postedCount > 0 ? 'text-emerald-400' : 'text-slate-400', icon: <CheckCheck className="w-4 h-4" /> },
                { label: 'High Virality', value: Array.from(viralityCache.values()).filter(v => v.score >= 80).length, color: 'text-violet-400', icon: <Sparkles className="w-4 h-4" /> },
                { label: 'Variants', value: galleryAssets.filter(a => a.variantOf).length, color: 'text-blue-400', icon: <Copy className="w-4 h-4" /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="card p-3">
                  <div className={`flex items-center gap-1.5 text-xs text-slate-500 mb-1 ${color}`}>{icon}<span>{label}</span></div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Filters + search + selection bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, type, ratio…"
                  className="input-dark pl-9"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
                {(['all', 'image', 'video'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAssetFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                      assetFilter === f ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-300">{selectedIds.size} selected</span>
                  <button onClick={clearSelection} className="btn-ghost text-sm p-1.5"><X className="w-4 h-4" /></button>
                  <button onClick={handleStageSelected} className="btn-primary text-sm flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Stage {selectedIds.size} Asset{selectedIds.size !== 1 ? 's' : ''} →
                  </button>

                </div>
              )}
              {selectedIds.size === 0 && filtered.length > 0 && (
                <button onClick={selectAll} className="btn-secondary text-sm">Select All</button>
              )}
              {/* Thumb size slider — only relevant in grid view */}
              {viewMode === 'grid' && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Rows3 className="w-4 h-4 text-slate-500" />
                  <input
                    type="range"
                    min={2}
                    max={6}
                    step={1}
                    value={thumbSize}
                    onChange={(e) => setThumbSize(Number(e.target.value))}
                    className="w-20 accent-violet-500 cursor-pointer"
                    title={`Thumbnail size: ${thumbSize}`}
                  />
                </div>
              )}
            </div>


            {/* Thumbnail grid / list */}
            {!selectedModelId ? (
              <div className="card py-20 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <Users className="w-8 h-8 text-violet-400" />
                </div>
                <p className="text-white font-semibold text-lg">Select a model to view their gallery</p>
                <p className="text-slate-500 text-sm mt-1">Use the model switcher in the left sidebar</p>
              </div>
            ) : r2Loading ? (
              <div className="card py-20 flex flex-col items-center text-center">
                <Loader2 className="w-10 h-10 text-violet-400 animate-spin mb-4" />
                <p className="text-slate-400 font-medium">Loading gallery…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="card py-16 flex flex-col items-center text-center">
                <FolderOpen className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-slate-400 font-medium">No assets found</p>
                <p className="text-slate-600 text-sm mt-1">Drag &amp; drop files here or click Upload to add assets</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className={`grid gap-3 ${
                thumbSize === 2 ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3' :
                thumbSize === 3 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' :
                thumbSize === 4 ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5' :
                thumbSize === 5 ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6' :
                                  'grid-cols-4 sm:grid-cols-6 md:grid-cols-8'
              }`}>
                {paginated.map((asset) => (
                  <AssetThumbnail
                    key={asset.id}
                    asset={asset}
                    selected={selectedIds.has(asset.id)}
                    approved={approvedIds.has(asset.id)}
                    isPosted={postedUrlSet.has(asset.fileUrl)}
                    onToggle={() => toggleSelect(asset.id)}
                    onApprove={(e) => toggleApprove(e, asset.id)}
                    onPreviewVideo={(e) => { e.stopPropagation(); setPreviewVideo(asset); }}
                    onEdit={() => setGalleryEditingAsset(asset)}
                    showVirality={showVirality}
                    viralityAnalysis={viralityCache.get(asset.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                      <th className="py-2.5 pl-3 pr-2 w-8" />
                      <th className="py-2.5 px-2 w-14" />
                      <th className="py-2.5 px-2">File name</th>
                      <th className="py-2.5 px-2">Type</th>
                      <th className="py-2.5 px-2">Ratio</th>
                      <th className="py-2.5 px-2">Size</th>
                      {showVirality && <th className="py-2.5 px-2">Virality</th>}
                      <th className="py-2.5 px-2 pr-3">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((asset) => {
                      const isSelected = selectedIds.has(asset.id);
                      const isPostedAsset = postedUrlSet.has(asset.fileUrl);
                      const uploadedLabel = asset.uploadedAt
                        ? new Date(asset.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—';
                      const isOkRatio = asset.aspectRatio
                        ? Math.abs(asset.aspectRatio - 1.0) < 0.03 || Math.abs(asset.aspectRatio - 0.8) < 0.03
                        : true;
                      const virality = viralityCache.get(asset.id);
                      const thumbnailSrc = asset.thumbnailUrl || asset.fileUrl;
                      return (
                        <tr
                          key={asset.id}
                          onClick={() => toggleSelect(asset.id)}
                          className={`border-b border-slate-800 cursor-pointer transition-colors last:border-0 ${
                            isSelected
                              ? 'bg-violet-500/10 border-violet-500/30'
                              : isPostedAsset
                              ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2 pl-3 pr-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-violet-600 border-violet-500' : 'border-slate-500'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                          </td>
                          {/* Thumbnail */}
                          <td className="py-2 px-2">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center flex-shrink-0">
                              {asset.fileType === 'video' ? (
                                thumbnailSrc ? (
                                  <img src={thumbnailSrc} alt={asset.fileName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                ) : (
                                  <Film className="w-5 h-5 text-slate-500" />
                                )
                              ) : asset.fileUrl ? (
                                <img src={asset.fileUrl} alt={asset.fileName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                          </td>
                          {/* File name */}
                          <td className="py-2 px-2 max-w-[180px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-slate-200 truncate text-sm">{asset.fileName}</p>
                              {asset.variantOf && (
                                <span className="flex-shrink-0 bg-blue-500/20 text-blue-300 text-[8px] px-1.5 py-0.5 rounded font-medium">
                                  {asset.variantLabel || 'Variant'}
                                </span>
                              )}
                              {isPostedAsset && (
                                <span className="flex-shrink-0 flex items-center gap-0.5 bg-emerald-600/80 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                  <CheckCheck className="w-2.5 h-2.5" />
                                  Posted
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Type badge */}
                          <td className="py-2 px-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              asset.fileType === 'video'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-pink-500/20 text-pink-300'
                            }`}>
                              {asset.fileType}
                            </span>
                          </td>
                          {/* Aspect ratio badge */}
                          <td className="py-2 px-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              isOkRatio ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {formatRatio(asset.aspectRatio)}
                            </span>
                          </td>
                          {/* File size */}
                          <td className="py-2 px-2 text-slate-400 text-xs whitespace-nowrap">
                            {asset.sizeBytes ? formatBytes(asset.sizeBytes) : '—'}
                          </td>
                          {/* Virality score */}
                          {showVirality && (
                            <td className="py-2 px-2">
                              {analyzingVirality.has(asset.id) ? (
                                <div className="flex items-center gap-1 text-slate-500">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span className="text-xs">...</span>
                                </div>
                              ) : asset.fileType === 'image' && virality ? (
                                <div className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" style={{
                                    color: virality.score >= 80 ? '#a855f7' : virality.score >= 60 ? '#f59e0b' : '#64748b'
                                  }} />
                                  <span className={`text-[11px] font-medium ${
                                    virality.score >= 80 ? 'text-violet-400' : virality.score >= 60 ? 'text-amber-400' : 'text-slate-400'
                                  }`}>
                                    {virality.score}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500">—</span>
                              )}
                            </td>
                          )}
                          {/* Upload date */}
                          <td className="py-2 px-2 pr-3 text-slate-400 text-xs whitespace-nowrap">
                            {uploadedLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination ── */}
            {filtered.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Page-size picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Show</span>
                  {([20, 50, 100] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => { setPageSize(n); setPage(1); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        pageSize === n
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="text-xs text-slate-500">per page</span>
                </div>

                {/* Page info + prev/next */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    ← Prev
                  </button>
                  {/* Page numbers — show at most 7 buttons */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce<(number | '…')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '…' ? (
                        <span key={`ellipsis-${i}`} className="text-xs text-slate-600 px-1">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                            page === p
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Approved assets action bar (sticky bottom) ── */}
          {approvedIds.size > 0 && (
            <div
              className="sticky bottom-6 z-30 flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 shadow-2xl"
              style={{
                background: 'rgba(17,17,17,0.92)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(34,197,94,0.3)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,197,94,0.15)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <ThumbsUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{approvedIds.size} asset{approvedIds.size !== 1 ? 's' : ''} approved</p>
                  <p className="text-[10px] text-green-400">Ready to schedule to smart time slots</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => clearApprovals()}
                  className="btn-ghost text-xs px-3 py-1.5"
                >
                  Clear
                </button>
                <button
                  onClick={handleScheduleApproved}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                >
                  <CalendarCheck className="w-4 h-4" />
                  Schedule {approvedIds.size} Post{approvedIds.size !== 1 ? 's' : ''} →
                </button>
              </div>
            </div>
          )}

          {/* Right: Feed Preview Panel */}
          {showFeedPreview && selectedModelId && (
            <div className="sticky top-24">
              <FeedPreviewPanel
                modelId={selectedModelId}
                modelName={selectedModel?.name || ''}
                selectedAssets={selectedAssets}
                isOpen={showFeedPreview}
                onToggle={() => setShowFeedPreview(false)}
              />
            </div>
          )}
        </div>
      </div>

      {showCreatePostModal && <CreatePostModal />}

      {/* ── Workflow overlays ── */}
      {workflowStep === 'staging' && (
        <StagingView onEditVariant={handleEditVariant} />
      )}

      {workflowStep === 'editing' && editingTarget && (() => {
        const sa = stagedAssets.find((s) => s.asset.id === editingTarget.assetId);
        if (!sa) return null;
        const existingVariant = sa.variants.find((v) => v.ratio === editingTarget.ratio);
        const item: EditableImage = {
          id: sa.asset.id,
          url: existingVariant?.editResult?.url || sa.asset.fileUrl,
          name: sa.asset.fileName,
          type: sa.asset.fileType,
        };
        return (
          <ImageEditor
            item={item}
            lockedRatio={editingTarget.ratio}
            onDone={handleEditorDone}
            onCancel={handleEditorCancel}
          />
        );
      })()}

      {workflowStep === 'scheduling' && <BatchScheduler />}

      {/* Direct-from-gallery editor */}
      {galleryEditingAsset && (
        <ImageEditor
          item={{
            id: galleryEditingAsset.id,
            url: galleryEditingAsset.fileUrl,
            name: galleryEditingAsset.fileName,
            type: galleryEditingAsset.fileType,
          }}
          onDone={handleGalleryEditorDone}
          onCancel={() => setGalleryEditingAsset(null)}
        />
      )}

      {/* Post-edit action sheet */}
      {postEditVariant && (
        <div className="fixed inset-0 z-[80] bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <p className="text-white font-semibold text-base">Edit saved</p>
              <p className="text-sm text-white/50 mt-0.5">Variant added to your gallery. What would you like to do next?</p>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={() => { approveAsset(postEditVariant.id); setPostEditVariant(null); }}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3"
              >
                <Check className="w-4 h-4" />
                Approve for scheduling
              </button>
              <button
                onClick={() => {
                  approveAsset(postEditVariant.id);
                  setStagedAssets([postEditVariant]);
                  setWorkflowStep('scheduling');
                  setPostEditVariant(null);
                }}
                className="w-full btn-secondary flex items-center justify-center gap-2 py-3"
              >
                <CalendarPlus className="w-4 h-4" />
                Schedule now
              </button>
              <button
                onClick={() => setPostEditVariant(null)}
                className="w-full text-sm text-white/40 hover:text-white/70 py-2 transition-colors"
              >
                Just save to gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video lightbox */}
      {previewVideo && (
        <VideoLightbox asset={previewVideo} onClose={() => setPreviewVideo(null)} />
      )}
      </div>{/* end drag-and-drop wrapper */}
    </AuthGuard>
  );
}
