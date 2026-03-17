'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockGalleryAssets } from '@/lib/mockData';
import AppHeader from '@/components/AppHeader';
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
  Send, MoreHorizontal, Play, Music2, Layers,
  Grid3X3, List, Rows3,
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

// ─── Asset Thumbnail ──────────────────────────────────────────────────────────

function AssetThumbnail({
  asset,
  selected,
  onToggle,
}: {
  asset: GalleryAsset;
  selected: boolean;
  onToggle: () => void;
}) {
  const isOkRatio = asset.aspectRatio
    ? Math.abs(asset.aspectRatio - 1.0) < 0.03 || Math.abs(asset.aspectRatio - 0.8) < 0.03
    : true;

  return (
    <div
      onClick={onToggle}
      className={`relative group aspect-square cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-150 ${
        selected
          ? 'border-blue-500 shadow-blue-500/30 shadow-lg'
          : 'border-slate-700 hover:border-slate-500'
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

      <div className={`absolute inset-0 transition-all duration-150 ${selected ? 'bg-blue-500/20' : 'group-hover:bg-slate-800/30'}`} />

      <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        selected ? 'bg-blue-600 border-blue-500' : 'bg-slate-900/70 border-slate-500 opacity-0 group-hover:opacity-100'
      }`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>

      {asset.fileType === 'video' && (
        <div className="absolute top-2 right-2 bg-slate-900/80 rounded px-1.5 py-0.5">
          <Film className="w-3 h-3 text-slate-300" />
        </div>
      )}

      <div className={`absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-medium ${
        isOkRatio ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
      }`}>
        {formatRatio(asset.aspectRatio)}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent px-2 py-2 translate-y-full group-hover:translate-y-0 transition-transform">
        <p className="text-[10px] text-slate-200 truncate">{asset.fileName}</p>
        {asset.sizeBytes && <p className="text-[9px] text-slate-400">{formatBytes(asset.sizeBytes)}</p>}
      </div>
    </div>
  );
}

// ─── Instagram Feed Preview ──────────────────────────────────────────────────

function InstagramFeedPreview({
  modelName,
  modelEmoji,
  scheduledPosts,
  fetchedPosts,
}: {
  modelName: string;
  modelEmoji: string;
  scheduledPosts: GalleryAsset[];
  fetchedPosts: IGPost[];
}) {
  const handle = modelName.toLowerCase().replace(/\s/g, '_');
  // Build a 3-col grid: scheduled first (with NEW badge), then fetched from API, then placeholders
  const totalSlots = 12;
  const scheduled = scheduledPosts.slice(0, 6);
  const fetched = fetchedPosts.slice(0, totalSlots - scheduled.length);
  const placeholders = Math.max(0, totalSlots - scheduled.length - fetched.length);

  return (
    <div className="bg-black rounded-2xl overflow-hidden border border-slate-700 w-full max-w-sm mx-auto">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-white text-[11px] font-semibold">9:41</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5 items-end">
            {[2, 3, 4, 4].map((h, i) => (
              <div key={i} style={{ height: h * 3 + 'px' }} className="w-1 bg-white rounded-sm" />
            ))}
          </div>
          <svg className="w-4 h-3 text-white" fill="currentColor" viewBox="0 0 24 16">
            <path d="M1 1h22v14H1z" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2" />
            <path d="M23 5v6a3 3 0 000-6z" />
            <rect x="2.5" y="2.5" width="17" height="11" rx="1" />
          </svg>
        </div>
      </div>

      {/* IG header */}
      <div className="flex items-center justify-between px-4 py-2">
        <svg viewBox="0 0 107 30" className="h-7 fill-white">
          <path d="M8.5 0C3.8 0 0 3.8 0 8.5v13C0 26.2 3.8 30 8.5 30h13C26.2 30 30 26.2 30 21.5v-13C30 3.8 26.2 0 21.5 0H8.5zm0 2h13c3.6 0 6.5 2.9 6.5 6.5v13c0 3.6-2.9 6.5-6.5 6.5h-13C4.9 28 2 25.1 2 21.5v-13C2 4.9 4.9 2 8.5 2z" />
        </svg>
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6 text-white" />
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Stories row */}
      <div className="px-2 py-2">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {[
            { label: 'Your story', isAdd: true },
            { label: 'lifestyle', isAdd: false },
            { label: 'travel', isAdd: false },
            { label: 'gym', isAdd: false },
            { label: 'food', isAdd: false },
          ].map(({ label, isAdd }) => (
            <div key={label} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-14 h-14 rounded-full ${isAdd ? 'bg-slate-800 border-2 border-dashed border-slate-500' : 'p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'}`}>
                <div className={`w-full h-full rounded-full bg-slate-900 flex items-center justify-center ${!isAdd ? 'border-2 border-black' : ''}`}>
                  {isAdd ? (
                    <span className="text-slate-400 text-xl leading-none">+</span>
                  ) : (
                    <span className="text-base">{modelEmoji}</span>
                  )}
                </div>
              </div>
              <span className="text-white text-[10px] truncate w-14 text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800" />

      {/* Profile header */}
      <div className="px-3 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-base">
          {modelEmoji}
        </div>
        <div className="flex-1">
          <p className="text-white text-xs font-semibold">{handle}</p>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">24.5K followers</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="bg-slate-800 border border-slate-600 text-white text-[10px] px-2.5 py-1 rounded-lg font-medium">Follow</span>
          <MoreHorizontal className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Post count & tab bar */}
      <div className="flex border-b border-slate-800">
        {['grid', 'reels', 'tags'].map((tab, i) => (
          <button key={tab} className={`flex-1 py-2.5 flex items-center justify-center ${i === 0 ? 'border-b-2 border-white' : ''}`}>
            {tab === 'grid' ? (
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                {[...Array(4)].map((_, j) => <div key={j} className={`rounded-sm ${i === 0 ? 'bg-white' : 'bg-slate-500'}`} />)}
              </div>
            ) : tab === 'reels' ? (
              <Play className={`w-4 h-4 ${i === 0 ? 'text-white' : 'text-slate-500'}`} />
            ) : (
              <svg viewBox="0 0 24 24" className={`w-4 h-4 ${i === 0 ? 'fill-white' : 'fill-slate-500'}`}>
                <path d="M20 4H4a1 1 0 00-1 1v1.5A.5.5 0 003.5 7H4v12a1 1 0 001 1h14a1 1 0 001-1V7h.5a.5.5 0 00.5-.5V5a1 1 0 00-1-1z" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-px bg-slate-800">
        {scheduled.map((asset, i) => (
          <div key={asset.id} className="relative aspect-square bg-slate-900 overflow-hidden">
            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
              {asset.fileType === 'video' ? (
                <Film className="w-5 h-5 text-slate-500" />
              ) : (
                <ImageIcon className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div className="absolute inset-0 bg-blue-500/20" />
            <span className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] px-1 py-0.5 rounded font-bold">NEW</span>
            {asset.fileType === 'video' && (
              <Play className="absolute bottom-1 right-1 w-3 h-3 text-white" />
            )}
          </div>
        ))}

        {fetched.map((post) => (
          <div key={post.id} className="relative aspect-square bg-slate-900 overflow-hidden">
            {post.media_url || post.thumbnail_url ? (
              <img
                src={post.thumbnail_url || post.media_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-slate-600" />
              </div>
            )}
            {post.media_type === 'VIDEO' && (
              <Play className="absolute bottom-1 right-1 w-3 h-3 text-white drop-shadow" />
            )}
          </div>
        ))}

        {Array.from({ length: placeholders }).map((_, i) => (
          <div key={`ph-${i}`} className="aspect-square bg-slate-900/60 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-slate-700" />
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-around px-2 py-3 border-t border-slate-800">
        {[
          <svg key="home" viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
          <Search key="search" className="w-6 h-6 text-slate-400" />,
          <div key="add" className="w-10 h-7 border-2 border-white rounded-lg flex items-center justify-center"><span className="text-white text-lg leading-none">+</span></div>,
          <Play key="reels" className="w-6 h-6 text-slate-400" />,
          <div key="profile" className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xs">{modelEmoji}</div>,
        ]}
      </div>
    </div>
  );
}

// ─── TikTok Feed Preview ──────────────────────────────────────────────────────

function TikTokFeedPreview({
  modelName,
  modelEmoji,
  scheduledPosts,
}: {
  modelName: string;
  modelEmoji: string;
  scheduledPosts: GalleryAsset[];
}) {
  const handle = modelName.toLowerCase().replace(/\s/g, '_');
  const items = scheduledPosts.length > 0 ? scheduledPosts.slice(0, 3) : null;

  return (
    <div className="bg-black rounded-2xl overflow-hidden border border-slate-700 w-full max-w-sm mx-auto">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-white text-[11px] font-semibold">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-5 h-2 border border-white rounded-sm"><div className="w-3/4 h-full bg-white rounded-sm" /></div>
        </div>
      </div>

      {/* TikTok top nav */}
      <div className="flex items-center justify-between px-4 py-2">
        <Search className="w-5 h-5 text-white" />
        <div className="flex gap-6 text-sm font-semibold">
          <span className="text-slate-400">Following</span>
          <div className="text-white border-b-2 border-white pb-0.5">For You</div>
        </div>
        <div className="w-5" />
      </div>

      {/* Video area */}
      {items && items[0] ? (
        <div className="relative mx-2 rounded-xl overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: 280 }}>
          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
            {items[0].fileType === 'video' ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-red-400" />
                </div>
                <span className="text-xs text-slate-400">{items[0].fileName}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="w-10 h-10 text-slate-600" />
                <span className="text-xs text-slate-400">Slideshow</span>
              </div>
            )}
          </div>

          {/* NEW badge */}
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
            SCHEDULED
          </div>

          {/* TikTok right sidebar */}
          <div className="absolute right-2 bottom-16 flex flex-col gap-5 items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center border-2 border-black text-base">
                {modelEmoji}
              </div>
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center -mt-2 border border-black">
                <span className="text-white text-[8px] font-bold">+</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Heart className="w-7 h-7 text-white" />
              <span className="text-white text-[10px]">42.1K</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="text-white text-[10px]">1.2K</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Bookmark className="w-7 h-7 text-white" />
              <span className="text-white text-[10px]">8.4K</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Send className="w-7 h-7 text-white" />
              <span className="text-white text-[10px]">Share</span>
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute left-0 right-12 bottom-0 px-3 py-3 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-xs font-semibold">@{handle}</p>
            <p className="text-slate-300 text-[10px] mt-0.5 line-clamp-2">✨ New content incoming! Stay tuned 🔥</p>
            <div className="flex items-center gap-1 mt-1.5">
              <Music2 className="w-3 h-3 text-white animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-white text-[10px]">Original sound - {handle}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-2 rounded-xl bg-slate-900 flex items-center justify-center" style={{ aspectRatio: '9/16', maxHeight: 280 }}>
          <div className="text-center">
            <Play className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-xs">Select assets to preview</p>
          </div>
        </div>
      )}

      {/* Post count chips */}
      {items && (
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar">
          {items.map((a, i) => (
            <div key={a.id} className={`flex-shrink-0 w-10 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-slate-600'}`} />
          ))}
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex items-center justify-around px-2 py-3 border-t border-slate-800 mt-1">
        {[
          { icon: <svg key="home" viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>, label: 'Home' },
          { icon: <Search className="w-6 h-6 text-slate-500" />, label: 'Discover' },
          { icon: <div className="w-10 h-7 bg-white rounded-lg flex items-center justify-center"><span className="text-black text-lg leading-none font-bold">+</span></div>, label: '' },
          { icon: <MessageCircle className="w-6 h-6 text-slate-500" />, label: 'Inbox' },
          { icon: <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-xs flex items-center justify-center">{modelEmoji}</div>, label: 'Me' },
        ].map(({ icon, label }, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {icon}
            {label && <span className={`text-[9px] ${i === 0 ? 'text-white' : 'text-slate-500'}`}>{label}</span>}
          </div>
        ))}
      </div>
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
  const { models, selectedModelId } = useStore();
  const model = models.find((m) => m.id === selectedModelId) || models[0];
  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [fetchedPosts, setFetchedPosts] = useState<IGPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState('');

  const fetchRealPosts = async () => {
    const conn = model?.metaConnection;
    if (!conn?.instagramAccountId || !conn?.accessToken) {
      setFeedError('Connect Meta API in Model Settings to load real posts.');
      return;
    }
    setLoadingFeed(true);
    setFeedError('');
    try {
      const res = await fetch(`/api/meta/media?accountId=${conn.instagramAccountId}&accessToken=${conn.accessToken}&limit=9`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setFetchedPosts(json.data || []);
    } catch (e: unknown) {
      setFeedError(e instanceof Error ? e.message : 'Failed to load feed');
    } finally {
      setLoadingFeed(false);
    }
  };

  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-400" />
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
            className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
              platform === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {p === 'instagram' ? '📸 Instagram' : '🎵 TikTok'}
          </button>
        ))}
      </div>

      {/* Real posts button */}
      <div className="flex items-center gap-2">
        <button
          onClick={fetchRealPosts}
          disabled={loadingFeed}
          className="btn-ghost text-xs flex items-center gap-1.5 py-1.5"
        >
          {loadingFeed ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {fetchedPosts.length > 0 ? 'Refresh Feed' : 'Load Real Posts'}
        </button>
        {feedError && <span className="text-[10px] text-amber-400 flex-1 line-clamp-1">{feedError}</span>}
        {fetchedPosts.length > 0 && (
          <span className="text-[10px] text-green-400">{fetchedPosts.length} posts loaded</span>
        )}
      </div>

      {/* Preview */}
      {platform === 'instagram' ? (
        <InstagramFeedPreview
          modelName={model?.name || 'Model'}
          modelEmoji={model?.profileImage || '👤'}
          scheduledPosts={selectedAssets}
          fetchedPosts={fetchedPosts}
        />
      ) : (
        <TikTokFeedPreview
          modelName={model?.name || 'Model'}
          modelEmoji={model?.profileImage || '👤'}
          scheduledPosts={selectedAssets}
        />
      )}

      {selectedAssets.length === 0 && (
        <p className="text-xs text-slate-500 text-center">Select assets from the gallery to preview them in the feed</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const {
    setModels, setSelectedModelId, setCurrentUser,
    galleryAssets, setGalleryAssets, addGalleryAsset,
    setShowCreatePostModal, setPreloadedGalleryAssets, showCreatePostModal,
    setStagedAssets, workflowStep, editingTarget, setEditingTarget,
    updateStagedVariant, setWorkflowStep, stagedAssets,
  } = useStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [search, setSearch] = useState('');
  const [showFeedPreview, setShowFeedPreview] = useState(false);
  const [thumbSize, setThumbSize] = useState(3);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setGalleryAssets(mockGalleryAssets);
  }, [setModels, setSelectedModelId, setCurrentUser, setGalleryAssets]);

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
  const arIssues = galleryAssets.filter((a) => {
    if (!a.aspectRatio || a.fileType === 'video') return false;
    return Math.abs(a.aspectRatio - 1.0) > 0.03 && Math.abs(a.aspectRatio - 0.8) > 0.03;
  }).length;

  const selectedAssets = galleryAssets.filter((a) => selectedIds.has(a.id));

  return (
    <div className="min-h-screen bg-slate-950">
      <AutoPublisher />
      <AppHeader activePage="gallery" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`flex gap-6 ${showFeedPreview ? 'lg:flex-row flex-col' : 'flex-col'}`}>
          {/* Left: gallery content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Content Gallery</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {galleryAssets.length} assets · {imageCount} images · {videoCount} videos
                  {arIssues > 0 && <span className="text-amber-400 ml-2">⚠ {arIssues} need cropping</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFeedPreview(!showFeedPreview)}
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all ${
                    showFeedPreview
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'btn-secondary'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Feed Preview
                </button>
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
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
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
                { label: 'AR Issues', value: arIssues, color: arIssues > 0 ? 'text-amber-400' : 'text-green-400', icon: <HardDrive className="w-4 h-4" /> },
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
                      filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
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
                    className="w-20 accent-blue-500 cursor-pointer"
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
                    onToggle={() => toggleSelect(asset.id)}
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
                              ? 'bg-blue-500/10 border-blue-500/30'
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2 pl-3 pr-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-blue-600 border-blue-500' : 'border-slate-500'
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
                            <p className="text-slate-200 truncate text-sm">{asset.fileName}</p>
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
      </main>

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
  );
}
