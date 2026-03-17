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
import { GalleryAsset, CropRatio } from '@/types/models';
import {
  Upload, Check, X, Film, Image as ImageIcon,
  HardDrive, Search, FolderOpen,
  Eye, Loader2, RefreshCw, Heart, MessageCircle, Bookmark,
  Send, Play, Music2, Layers,
  Grid3X3, List, Rows3, CheckCheck, ThumbsUp, CalendarCheck,
  Clapperboard, BookMarked, UserCheck, ArrowLeft, MoreHorizontal,
  Share2, ChevronRight, Plus, Wifi, Signal, Battery,
} from 'lucide-react';
import { InstagramIcon, TikTokIcon } from '@/components/PlatformIcons';

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

// ─── Asset Thumbnail ──────────────────────────────────────────────────────────

function AssetThumbnail({
  asset,
  selected,
  approved,
  isPosted,
  onToggle,
  onApprove,
}: {
  asset: GalleryAsset;
  selected: boolean;
  approved: boolean;
  isPosted: boolean;
  onToggle: () => void;
  onApprove: (e: React.MouseEvent) => void;
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
          <Film className="w-8 h-8 text-slate-600" />
        ) : asset.fileUrl ? (
          <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" />
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

      {/* Select checkbox */}
      <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        selected ? 'bg-violet-600 border-violet-500' : 'bg-black/60 border-white/30 opacity-0 group-hover:opacity-100'
      }`}>
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
        }`}
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

      {asset.fileType === 'video' && !isPosted && !approved && (
        <div className="absolute top-2 right-2 bg-black/60 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Film className="w-3 h-3 text-slate-300" />
        </div>
      )}

      <div className={`absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-medium ${
        isOkRatio ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
      }`}>
        {formatRatio(asset.aspectRatio)}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-2 translate-y-full group-hover:translate-y-0 transition-transform">
        <p className="text-[10px] text-slate-200 truncate">{asset.fileName}</p>
        {asset.sizeBytes && <p className="text-[9px] text-slate-400">{formatBytes(asset.sizeBytes)}</p>}
      </div>
    </div>
  );
}

// ─── Phone Frame (shared) ───────────────────────────────────────────────

function PhoneFrame({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-[44px]"
      style={{
        width: 320,
        height: 640,
        background: dark ? '#000' : '#fff',
        border: '6px solid #1a1a1a',
        boxShadow: '0 0 0 1px #333, 0 20px 50px rgba(0,0,0,0.5)',
      }}
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 rounded-b-2xl z-10" style={{ background: '#1a1a1a' }} />
      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 h-7 flex items-end justify-between px-5 pb-1 z-20">
        <span className="text-[9px] font-bold" style={{ color: dark ? '#fff' : '#000' }}>9:41</span>
        <div className="flex items-center gap-1">
          <svg width="12" height="7" viewBox="0 0 12 7" fill="currentColor" style={{ color: dark ? '#fff' : '#000' }} className="opacity-90">
            <rect x="0" y="3" width="3" height="4" rx="0.5" />
            <rect x="4.5" y="1.5" width="3" height="5.5" rx="0.5" />
            <rect x="9" y="0" width="3" height="7" rx="0.5" />
          </svg>
          <svg width="11" height="7" viewBox="0 0 11 7" fill="currentColor" style={{ color: dark ? '#fff' : '#000' }} className="opacity-90">
            <path d="M3 6a4.24 4.24 0 0 1 6 0" strokeWidth="0.8" stroke="currentColor" fill="none" strokeLinecap="round" />
            <path d="M1 3.5A7.5 7.5 0 0 1 8.5 3.5" strokeWidth="0.8" stroke="currentColor" fill="none" strokeLinecap="round" />
          </svg>
          <svg width="20" height="10" viewBox="0 0 20 10" fill="none" style={{ color: dark ? '#fff' : '#000' }} className="opacity-90">
            <rect x="0.5" y="0.5" width="16" height="9" rx="2.5" stroke="currentColor" strokeOpacity="0.45" />
            <rect x="1.5" y="1.5" width="13" height="7" rx="1.5" fill="currentColor" />
            <path d="M17 4v3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5" />
          </svg>
        </div>
      </div>
      {/* Screen content */}
      <div className="absolute inset-0 top-7 overflow-y-auto no-scrollbar" style={{ borderRadius: 38 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Instagram Profile View ───────────────────────────────────────────────

function IGProfilePreview({ modelName, selectedAssets }: { modelName: string; selectedAssets: GalleryAsset[] }) {
  const [activeTab, setActiveTab] = useState<'grid' | 'reels' | 'tagged'>('grid');
  const handle = modelName.toLowerCase().replace(/\s+/g, '_');

  return (
    <div className="flex flex-col" style={{ background: '#fff', minHeight: '100%' }}>
      {/* Nav bar */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ background: '#fff', borderBottom: '0.5px solid #dbdbdb' }}>
        <div className="w-5" />
        <span className="text-[13px] font-bold text-black">{handle}</span>
        <div className="flex items-center gap-3">
          <Plus className="w-5 h-5 text-black" />
          <MoreHorizontal className="w-5 h-5 text-black" />
        </div>
      </div>

      {/* Profile header */}
      <div className="px-4 pt-3 pb-2">
        {/* Avatar + stats row */}
        <div className="flex items-center gap-4 mb-3">
          {/* Avatar with story ring */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full p-[2.5px]"
              style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
              <div className="w-full h-full rounded-full overflow-hidden" style={{ background: '#ddd' }}>
                <div className="w-full h-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-xl text-white font-bold">
                  {modelName[0]}
                </div>
              </div>
            </div>
          </div>
          {/* Stats */}
          <div className="flex-1 grid grid-cols-3 text-center">
            {[
              { label: 'Posts', val: String(selectedAssets.length) },
              { label: 'Followers', val: '47.2K' },
              { label: 'Following', val: '312' },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-[13px] font-bold text-black leading-tight">{val}</p>
                <p className="text-[10px] text-black">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        <p className="text-[11px] font-bold text-black leading-tight">{modelName}</p>
        <p className="text-[10px] text-black mt-0.5 leading-snug">
          ✨ Content creator · Link in bio 🔗
        </p>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2.5">
          <button className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-black"
            style={{ background: '#efefef' }}>Edit profile</button>
          <button className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-black"
            style={{ background: '#efefef' }}>Share profile</button>
          <button className="w-8 h-7 rounded-lg flex items-center justify-center" style={{ background: '#efefef' }}>
            <UserCheck className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </div>

      {/* Story highlights */}
      <div className="px-4 py-2">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {['New✨', 'Gym', 'Travel', 'BTS', 'Faves'].map((name) => (
            <div key={name} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-11 h-11 rounded-full p-[1.5px]" style={{ background: '#dbdbdb' }}>
                <div className="w-full h-full rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400" />
                </div>
              </div>
              <span className="text-[9px] text-black text-center max-w-[44px] truncate">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ borderTop: '0.5px solid #dbdbdb', borderBottom: '0.5px solid #dbdbdb' }}>
        {[
          { id: 'grid', Icon: Grid3X3 },
          { id: 'reels', Icon: Clapperboard },
          { id: 'tagged', Icon: BookMarked },
        ].map(({ id, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className="flex-1 py-2.5 flex items-center justify-center"
            style={{ borderBottom: activeTab === id ? '1px solid #000' : '1px solid transparent' }}
          >
            <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: activeTab === id ? '#000' : '#8e8e8e' }} />
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3" style={{ gap: 1.5 }}>
        {selectedAssets.length > 0 ? selectedAssets.map((asset, idx) => (
          <div key={asset.id} className="relative aspect-square overflow-hidden" style={{ background: '#e5e5e5' }}>
            {asset.fileUrl ? (
              <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {asset.fileType === 'video' ? (
                  <Film className="w-8 h-8 text-slate-500" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-500" />
                )}
              </div>
            )}
            {/* NEW badge */}
            <div className="absolute top-1 left-1">
              <span className="bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold leading-none">NEW</span>
            </div>
            {/* Play indicator for videos */}
            {asset.fileType === 'video' && (
              <Play className="absolute bottom-1 right-1 w-4 h-4 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
            )}
          </div>
        )) : (
          <div className="col-span-3 py-12 text-center" style={{ background: '#fafafa' }}>
            <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Select assets to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TikTok Feed View ─────────────────────────────────────────────────

function TikTokFeedPreview({ modelName, selectedAssets }: { modelName: string; selectedAssets: GalleryAsset[] }) {
  const handle = modelName.toLowerCase().replace(/\s/g, '');

  return (
    <div className="flex flex-col" style={{ background: '#fff', minHeight: '100%' }}>
      {/* Nav */}
      <div className="flex items-center justify-between px-4 py-2.5 sticky top-0 z-10" style={{ background: '#fff' }}>
        <ArrowLeft className="w-5 h-5 text-black" />
        <span className="text-[13px] font-bold text-black">@{handle}</span>
        <div className="flex items-center gap-3">
          <Share2 className="w-4.5 h-4.5 text-black" style={{ width: 18, height: 18 }} />
          <MoreHorizontal className="w-5 h-5 text-black" />
        </div>
      </div>

      {/* Profile section */}
      <div className="flex flex-col items-center px-4 pt-2 pb-4">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full overflow-hidden mb-2"
          style={{ border: '2px solid #f0f0f0' }}>
          <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-3xl text-white font-bold">
            {modelName[0]}
          </div>
        </div>
        <p className="text-[14px] font-bold text-black mb-0.5">@{handle}</p>
        <p className="text-[11px] text-gray-500 mb-3">{modelName}</p>

        {/* Stats */}
        <div className="flex gap-6 mb-3">
          {[
            { val: '312', label: 'Following' },
            { val: '128.4K', label: 'Followers' },
            { val: '2.1M', label: 'Likes' },
          ].map(({ val, label }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-[14px] font-bold text-black">{val}</span>
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Follow / Message buttons */}
        <div className="flex gap-2 w-full">
          <button className="flex-1 py-2 rounded-md text-[12px] font-bold text-white"
            style={{ background: '#FE2C55' }}>Follow</button>
          <button className="flex-1 py-2 rounded-md text-[12px] font-semibold text-black"
            style={{ background: '#f1f1f2', border: '1px solid #e5e5e5' }}>Message</button>
        </div>

        {/* Bio */}
        <p className="text-[10px] text-black text-center mt-2 leading-snug">
          ✨ Content creator · New videos daily 🔥
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ borderTop: '0.5px solid #f0f0f0', borderBottom: '0.5px solid #f0f0f0' }}>
        {[
          { id: 'videos', label: 'Videos' },
          { id: 'liked', label: 'Liked' },
          { id: 'saved', label: 'Saved' },
        ].map(({ id, label }) => (
          <button key={id} className="flex-1 py-2.5 text-[11px] font-semibold transition-colors text-black">
            {label}
          </button>
        ))}
      </div>

      {/* Video grid */}
      {selectedAssets.length > 0 ? (
        <div className="grid grid-cols-3" style={{ gap: 0.5 }}>
          {selectedAssets.map((asset, idx) => (
            <div key={asset.id} className="relative overflow-hidden" style={{ aspectRatio: '9/16', background: '#f5f5f5' }}>
              {asset.fileUrl ? (
                <img src={asset.fileUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-slate-500" />
                </div>
              )}
              <Play className="absolute top-1 right-1 w-5 h-5 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center" style={{ background: '#fafafa' }}>
          <Play className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Select assets to preview</p>
        </div>
      )}
    </div>
  );
}


// ─── Feed Preview Panel ───────────────────────────────────────────────────────

function FeedPreviewPanel({
  selectedAssets,
  onClose,
}: {
  selectedAssets: GalleryAsset[];
  onClose: () => void;
}) {
  const { selectedModelId } = useStore();
  const models = useStore(getVisibleModels);
  const model = models.find((m) => m.id === selectedModelId) || models[0];
  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');

  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold text-white text-sm">Feed Preview</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Platform toggle */}
      <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
        {(['instagram', 'tiktok'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
              platform === p ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {p === 'instagram' ? <><InstagramIcon size={14} /> Instagram</> : <><TikTokIcon size={14} /> TikTok</>}
          </button>
        ))}
      </div>

      {/* Phone frame preview */}
      <div className="flex justify-center py-2">
        <PhoneFrame dark={platform === 'tiktok'}>
          {platform === 'instagram' ? (
            <IGProfilePreview modelName={model?.name || 'Model'} selectedAssets={selectedAssets} />
          ) : (
            <TikTokFeedPreview modelName={model?.name || 'Model'} selectedAssets={selectedAssets} />
          )}
        </PhoneFrame>
      </div>

      {selectedAssets.length === 0 && (
        <p className="text-xs text-slate-500 text-center">Select assets from the gallery to preview them in the feed</p>
      )}
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
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [search, setSearch] = useState('');
  const [showFeedPreview, setShowFeedPreview] = useState(false);
  const [thumbSize, setThumbSize] = useState(3);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [r2Loading, setR2Loading] = useState(false);
  const [r2Error, setR2Error] = useState<string | null>(null);

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    // Gallery assets loaded from R2 or local uploads, not mock data
  }, [setModels, setSelectedModelId, setCurrentUser]);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  const loadFromR2 = useCallback(async () => {
    if (!selectedModel?.s3Folder) return;
    setR2Loading(true);
    setR2Error(null);
    try {
      const res = await fetch(`/api/r2/gallery?modelFolder=${encodeURIComponent(selectedModel.s3Folder)}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to load from R2');
      setGalleryAssets(json.assets);
    } catch (err) {
      setR2Error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setR2Loading(false);
    }
  }, [selectedModel, setGalleryAssets]);

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      addGalleryAsset({
        id: `local-${Date.now()}-${file.name}`,
        fileName: file.name,
        fileUrl: url,
        fileType: isVideo ? 'video' : 'image',
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        source: 'local',
      });
    });
  };

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

  const handleEditorDone = useCallback((result: ImageEditorResult) => {
    if (!editingTarget) return;
    updateStagedVariant(editingTarget.assetId, editingTarget.ratio, {
      url: result.url,
      namedFilter: result.filters.namedFilter,
      filters: result.filters as unknown as Record<string, number>,
      overlays: result.overlays,
    });
    setEditingTarget(null);
    setWorkflowStep('staging');
  }, [editingTarget, updateStagedVariant, setEditingTarget, setWorkflowStep]);

  const handleEditorCancel = useCallback(() => {
    setEditingTarget(null);
    setWorkflowStep('staging');
  }, [setEditingTarget, setWorkflowStep]);

  const filtered = galleryAssets.filter((a) => {
    if (filter === 'image' && a.fileType !== 'image') return false;
    if (filter === 'video' && a.fileType !== 'video') return false;
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
      <div className="min-h-screen">
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
                  {galleryAssets.length} assets · {imageCount} images · {videoCount} videos
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
                  onClick={loadFromR2}
                  disabled={r2Loading || !selectedModel?.s3Folder}
                  className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40"
                  title={selectedModel?.s3Folder ? `Load from vault-storage/[MODELS]/${selectedModel.s3Folder}/` : 'No R2 folder configured'}
                >
                  {r2Loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                  {r2Loading ? 'Loading…' : 'Load from Vault'}
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

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Assets', value: galleryAssets.length, color: 'text-slate-200', icon: <FolderOpen className="w-4 h-4" /> },
                { label: 'Images', value: imageCount, color: 'text-pink-400', icon: <ImageIcon className="w-4 h-4" /> },
                { label: 'Videos', value: videoCount, color: 'text-red-400', icon: <Film className="w-4 h-4" /> },
                { label: 'Already Posted', value: postedCount, color: postedCount > 0 ? 'text-emerald-400' : 'text-slate-400', icon: <CheckCheck className="w-4 h-4" /> },
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
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                      filter === f ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
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
            {filtered.length === 0 ? (
              <div className="card py-16 flex flex-col items-center text-center">
                <FolderOpen className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-slate-400 font-medium">No assets found</p>
                <p className="text-slate-600 text-sm mt-1">Upload files or connect your S3 bucket</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className={`grid gap-3 ${
                thumbSize === 2 ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3' :
                thumbSize === 3 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' :
                thumbSize === 4 ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5' :
                thumbSize === 5 ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6' :
                                  'grid-cols-4 sm:grid-cols-6 md:grid-cols-8'
              }`}>
                {filtered.map((asset) => (
                  <AssetThumbnail
                    key={asset.id}
                    asset={asset}
                    selected={selectedIds.has(asset.id)}
                    approved={approvedIds.has(asset.id)}
                    isPosted={postedUrlSet.has(asset.fileUrl)}
                    onToggle={() => toggleSelect(asset.id)}
                    onApprove={(e) => toggleApprove(e, asset.id)}
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
                      <th className="py-2.5 px-2 pr-3">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((asset) => {
                      const isSelected = selectedIds.has(asset.id);
                      const isPostedAsset = postedUrlSet.has(asset.fileUrl);
                      const uploadedLabel = asset.uploadedAt
                        ? new Date(asset.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—';
                      const isOkRatio = asset.aspectRatio
                        ? Math.abs(asset.aspectRatio - 1.0) < 0.03 || Math.abs(asset.aspectRatio - 0.8) < 0.03
                        : true;
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
                                <Film className="w-5 h-5 text-slate-500" />
                              ) : asset.fileUrl ? (
                                <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                          </td>
                          {/* File name */}
                          <td className="py-2 px-2 max-w-[180px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-slate-200 truncate text-sm">{asset.fileName}</p>
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
          {showFeedPreview && (
            <div className="lg:w-80 xl:w-96 flex-shrink-0">
              <div className="sticky top-24">
                <FeedPreviewPanel
                  selectedAssets={selectedAssets}
                  onClose={() => setShowFeedPreview(false)}
                />
              </div>
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
      </div>
    </AuthGuard>
  );
}
