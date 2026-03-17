'use client';

import { useStore } from '@/lib/store';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Sparkles, Upload, Check, Info, Film, Image as ImageIcon,
  AlertTriangle, Plus, ChevronLeft, ChevronRight, Heart, MessageCircle,
  Send, Bookmark, MoreHorizontal, Repeat2, Library, Loader2, Pencil,
} from 'lucide-react';
import { PostType, Platform, Asset, Caption } from '@/types/models';
import { checkImageAspectRatios } from '@/lib/ar-checker';
import type { ARCheckResult, PostFormat, MediaItem } from '@/types/utils';
import ImageEditor, { EditableImage, FilterState, OverlayItem, ImageEditorResult } from './ImageEditor';
import { PLATFORM_THEMES, getPostTypeForPlatformAndRatio } from '@/lib/constants/platform';

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_CONFIG: Record<PostFormat, {
  label: string;
  emoji: string;
  description: string;
  platforms: Platform[];
  postTypeMap: Partial<Record<Platform, PostType>>;
}> = {
  carousel: { label: 'Carousel', emoji: '🖼️', description: 'IG Carousel + TikTok Slideshow', platforms: ['instagram', 'tiktok'], postTypeMap: { instagram: 'instagram_post', tiktok: 'tiktok_slideshow' } },
  reels:    { label: 'Reel',     emoji: '🎬', description: 'Instagram Reel + TikTok Reel',   platforms: ['instagram', 'tiktok'], postTypeMap: { instagram: 'instagram_reel',  tiktok: 'tiktok_reel'       } },
  threads:  { label: 'Threads',  emoji: '🧵', description: 'Threads post',                   platforms: ['threads'],             postTypeMap: { threads: 'threads_post'                                   } },
  story:    { label: 'Story',    emoji: '⭕', description: 'Instagram Story',                 platforms: ['instagram'],           postTypeMap: { instagram: 'instagram_story'                              } },
  x:        { label: 'X Post',   emoji: '𝕏', description: 'X (Twitter) post',               platforms: ['x'],                   postTypeMap: { x: 'x_post'                                              } },
};

const getPlatformStyle = (platform: Platform) => {
  const theme = PLATFORM_THEMES[platform];
  return {
    label: theme.label,
    icon: theme.icon,
    section: theme.bgDim.replace('bg-', 'border ').replace('/15', '/25') + ' ' + theme.bgDim,
    header: theme.bgDim + ' border-b ' + theme.border.replace('bg-', 'border-') + '/25 ' + theme.text,
    badge: theme.bgDim + ' border ' + theme.border.replace('bg-', 'border-') + '/30 ' + theme.text,
  };
};

const FORMAT_TO_IG_POST_TYPE: Record<PostFormat, PostType> = {
  carousel: 'instagram_post',
  reels:    'instagram_reel',
  threads:  'threads_post',
  story:    'instagram_story',
  x:        'x_post',
};

function getVideoAspectRatio(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.videoWidth / video.videoHeight); };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    video.src = url;
  });
}

// ─── Library Quick Picks ──────────────────────────────────────────────────────

function LibraryPicks({ captions, postType, onSelect }: {
  captions: Caption[]; postType: PostType; onSelect: (text: string) => void;
}) {
  const relevant = useMemo(() => captions.filter((c) => c.postType === postType).slice(0, 6), [captions, postType]);
  if (relevant.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
        <Library className="w-3 h-3" /> From library:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {relevant.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.text)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
          >
            {c.text.slice(0, 30)}…
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Media Item Card ──────────────────────────────────────────────────────────

interface MediaItemCardProps {
  item: MediaItem;
  index: number;
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
  arCheck?: ARCheckResult;
}

function MediaItemCard({ item, index, onRemove, onEdit, arCheck }: MediaItemCardProps) {
  return (
    <div className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden bg-slate-800">
        {item.type === 'image' ? (
          <img src={item.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-slate-600" />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3 text-white" />
      </button>

      {/* Edit button for images */}
      {item.type === 'image' && (
        <button
          type="button"
          onClick={() => onEdit(index)}
          className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 hover:bg-blue-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="w-3 h-3 text-white" />
        </button>
      )}

      {/* AR Warning */}
      {arCheck && !arCheck.valid && (
        <div className="absolute top-1 left-1 flex items-center gap-1 bg-yellow-500/90 text-black text-[9px] px-1.5 py-0.5 rounded">
          <AlertTriangle className="w-2.5 h-2.5" />
          {arCheck.message}
        </div>
      )}

      {/* Index badge */}
      <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
    </div>
  );
}

// ─── Platform Post Section ──────────────────────────────────────────────────────

interface PlatformPostSectionProps {
  platform: Platform;
  postType: PostType;
  scheduledTime: string;
  onTimeChange: (time: string) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  onSchedule: () => void;
  onSkip: () => void;
  isScheduled: boolean;
}

function PlatformPostSection({
  platform,
  postType,
  scheduledTime,
  onTimeChange,
  description,
  onDescriptionChange,
  onSchedule,
  onSkip,
  isScheduled,
}: PlatformPostSectionProps) {
  const style = getPlatformStyle(platform);

  return (
    <div className={`rounded-xl overflow-hidden ${style.section}`}>
      {/* Header */}
      <div className={`px-4 py-2 flex items-center gap-2 ${style.header}`}>
        <span className="text-lg">{style.icon}</span>
        <span className="font-semibold text-sm">{style.label}</span>
        <span className="text-xs opacity-75">· {postType.replace(platform + '_', ' ')}</span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Schedule time */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Schedule Time</label>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Caption / Description</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Add a caption..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isScheduled ? (
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 btn-secondary text-xs py-2"
            >
              Unschedule
            </button>
          ) : (
            <button
              type="button"
              onClick={onSchedule}
              className="flex-1 btn-primary text-xs py-2"
            >
              Schedule Post
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main CreatePostModal ─────────────────────────────────────────────────────

interface CreatePostModalProps {
  onClose: () => void;
}

export default function CreatePostModal({ onClose }: CreatePostModalProps) {
  const { models, selectedModelId, posts, captions, addPost, editingPost, setEditingPost } = useStore();
  const selectedModel = models.find((m) => m.id === selectedModelId);

  const [format, setFormat] = useState<PostFormat>('carousel');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [arCheckResults, setArCheckResults] = useState<Record<number, ARCheckResult>>({});
  const [globalCaption, setGlobalCaption] = useState('');
  const [platformData, setPlatformData] = useState<Record<Platform, { scheduledTime: string; description: string; enabled: boolean }>>({
    instagram: { scheduledTime: '', description: '', enabled: false },
    tiktok:    { scheduledTime: '', description: '', enabled: false },
    threads:   { scheduledTime: '', description: '', enabled: false },
    x:         { scheduledTime: '', description: '', enabled: false },
    fanvue:    { scheduledTime: '', description: '', enabled: false },
  });
  const [uploading, setUploading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [editingItem, setEditingItem] = useState<{ index: number; item: MediaItem } | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Initialize from editing post
  useEffect(() => {
    if (editingPost) {
      setFormat(
        editingPost.postType.startsWith('instagram_')
          ? editingPost.postType === 'instagram_reel'
            ? 'reels'
            : editingPost.postType === 'instagram_story'
            ? 'story'
            : 'carousel'
          : editingPost.postType.startsWith('tiktok_')
          ? 'reels'
          : editingPost.postType === 'threads_post'
          ? 'threads'
          : 'x'
      );
      setGlobalCaption(editingPost.description);
      setMediaItems(
        editingPost.assets.map((asset) => ({
          id: asset.id,
          url: asset.fileUrl,
          name: asset.fileName,
          type: asset.fileType,
          file: undefined,
          filters: undefined,
          overlays: undefined,
        }))
      );
      setPlatformData({
        instagram: {
          scheduledTime: editingPost.scheduledTime.slice(0, 16),
          description: editingPost.description,
          enabled: editingPost.platform === 'instagram',
        },
        tiktok: {
          scheduledTime: editingPost.scheduledTime.slice(0, 16),
          description: editingPost.description,
          enabled: editingPost.platform === 'tiktok',
        },
        threads: {
          scheduledTime: editingPost.scheduledTime.slice(0, 16),
          description: editingPost.description,
          enabled: editingPost.platform === 'threads',
        },
        x: {
          scheduledTime: editingPost.scheduledTime.slice(0, 16),
          description: editingPost.description,
          enabled: editingPost.platform === 'x',
        },
        fanvue: {
          scheduledTime: '',
          description: '',
          enabled: false,
        },
      });
    }
  }, [editingPost]);

  // Enable/disable platforms based on format
  useEffect(() => {
    const formatConfig = FORMAT_CONFIG[format];
    setPlatformData((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([platform, data]) => [
          platform,
          {
            ...data,
            enabled: formatConfig.platforms.includes(platform as Platform),
          },
        ])
      )
    );
  }, [format]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setUploading(true);
      const newItems: MediaItem[] = [];
      const newArChecks: Record<number, ARCheckResult> = {};

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        const url = URL.createObjectURL(file);

        const item: MediaItem = {
          id: `temp-${Date.now()}-${i}`,
          url,
          name: file.name,
          type: isVideo ? 'video' : 'image',
          file,
        };

        // Check aspect ratio for images
        if (!isVideo) {
          const img = new Image();
          img.onload = () => {
            try {
              const arCheck = checkImageAspectRatios(img.width, img.height, format);
              if (!arCheck.valid) {
                newArChecks[mediaItems.length + newItems.length] = arCheck;
              }
            } catch (error) {
              console.error('AR check failed:', error);
            }
            setArCheckResults((prev) => ({ ...prev, ...newArChecks }));
          };
          img.src = url;
        }

        newItems.push(item);
      }

      setMediaItems((prev) => [...prev, ...newItems]);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [format, mediaItems.length]
  );

  const handleRemoveItem = useCallback((index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
    setArCheckResults((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const handleEditItem = useCallback((index: number) => {
    setEditingItem({ index, item: mediaItems[index] });
  }, [mediaItems]);

  const handleImageEditorClose = useCallback(() => {
    setEditingItem(null);
  }, []);

  const handleImageEditorSave = useCallback(
    (result: ImageEditorResult) => {
      if (!editingItem) return;
      const updatedItems = [...mediaItems];
      updatedItems[editingItem.index] = {
        ...editingItem.item,
        url: result.url,
        filters: result.filters,
        overlays: result.overlays,
      };
      setMediaItems(updatedItems);
      setEditingItem(null);
    },
    [editingItem, mediaItems]
  );

  const handleScheduleAll = useCallback(async () => {
    if (!selectedModel) return;

    setScheduling(true);
    const formatConfig = FORMAT_CONFIG[format];

    // Schedule post for each enabled platform
    for (const platform of formatConfig.platforms) {
      const data = platformData[platform];
      if (!data.enabled || !data.scheduledTime) continue;

      const postType = formatConfig.postTypeMap[platform];
      if (!postType) continue;

      const newPost = {
        id: editingPost?.id || `post-${Date.now()}-${platform}`,
        modelId: selectedModel.id,
        platform,
        postType,
        scheduledTime: data.scheduledTime + ':00',
        status: 'scheduled' as const,
        description: data.description || globalCaption,
        assets: mediaItems.map((item, idx) => ({
          id: `asset-${Date.now()}-${idx}`,
          postId: editingPost?.id || `post-${Date.now()}-${platform}`,
          fileUrl: item.url,
          fileName: item.name,
          fileType: item.type,
          order: idx + 1,
        })),
        createdAt: editingPost?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingPost) {
        // Update existing post
        // Note: In real app, you'd call updatePost instead of addPost
        addPost(newPost);
      } else {
        addPost(newPost);
      }
    }

    setScheduling(false);
    setEditingPost(null);
    onClose();
  }, [selectedModel, format, platformData, globalCaption, mediaItems, editingPost, addPost, setEditingPost, onClose]);

  const hasAnyMedia = mediaItems.length > 0;
  const hasInvalidAr = Object.values(arCheckResults).some((r) => !r.valid);
  const formatConfig = FORMAT_CONFIG[format];
  const igPostType = FORMAT_TO_IG_POST_TYPE[format];
  const relevantCaptions = useMemo(() => captions.filter((c) => c.postType === igPostType), [captions, igPostType]);

  // Close on Escape key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Close when clicking backdrop
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-white">{editingPost ? 'Edit Post' : 'Create New Post'}</h2>
            <p className="text-xs text-slate-400">Schedule content across multiple platforms</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block">Post Format</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(FORMAT_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormat(key as PostFormat)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    format === key
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{config.emoji}</div>
                  <div className="text-xs font-medium">{config.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">{config.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Media Files</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {hasAnyMedia ? (
              <>
                {uploading && (
                  <div className="flex items-center justify-center py-8 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing files...
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {mediaItems.map((item, idx) => (
                    <MediaItemCard
                      key={item.id}
                      item={item}
                      index={idx}
                      onRemove={handleRemoveItem}
                      onEdit={handleEditItem}
                      arCheck={arCheckResults[idx]}
                    />
                  ))}
                </div>

                {hasInvalidAr && (
                  <div className="mt-3 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-yellow-300">
                      <p className="font-medium mb-1">Aspect Ratio Warning</p>
                      <p>Some images may not display optimally on this platform. Consider editing or using different content.</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-500 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Drop files here or click to upload</p>
                <p className="text-xs mt-1">Images and videos supported</p>
              </div>
            )}
          </div>

          {/* Global Caption */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Caption</label>
              <button
                type="button"
                onClick={() => setShowLibrary(!showLibrary)}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                AI Generate
              </button>
            </div>

            <textarea
              value={globalCaption}
              onChange={(e) => setGlobalCaption(e.target.value)}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Write a caption for your post..."
            />

            {showLibrary && <LibraryPicks captions={relevantCaptions} postType={igPostType} onSelect={setGlobalCaption} />}
          </div>

          {/* Platform Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formatConfig.platforms.map((platform) => (
              <PlatformPostSection
                key={platform}
                platform={platform}
                postType={formatConfig.postTypeMap[platform]!}
                scheduledTime={platformData[platform].scheduledTime}
                onTimeChange={(time) => setPlatformData((prev) => ({ ...prev, [platform]: { ...prev[platform], scheduledTime: time } }))}
                description={platformData[platform].description || globalCaption}
                onDescriptionChange={(text) => setPlatformData((prev) => ({ ...prev, [platform]: { ...prev[platform], description: text } }))}
                onSchedule={() => {}}
                onSkip={() => {}}
                isScheduled={!!platformData[platform].scheduledTime}
              />
            ))}
          </div>

          {/* Schedule Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button type="button" onClick={onClose} className="btn-secondary text-sm py-2 px-4">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleScheduleAll}
              disabled={!hasAnyMedia || hasInvalidAr || scheduling}
              className="btn-primary text-sm py-2 px-6 flex items-center gap-2 disabled:opacity-40"
            >
              {scheduling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Schedule {formatConfig.platforms.length} Platform{formatConfig.platforms.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Editor Modal */}
      {editingItem && (
        <ImageEditor
          imageUrl={editingItem.item.url}
          onSave={handleImageEditorSave}
          onClose={handleImageEditorClose}
          initialFilters={editingItem.item.filters}
          initialOverlays={editingItem.item.overlays}
        />
      )}
    </div>
  );
}
