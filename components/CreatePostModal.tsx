'use client';

import { useStore } from '@/lib/store';
import { useState, useRef, useEffect } from 'react';
import {
  X, Sparkles, Upload, Check, Info, Film, Image as ImageIcon,
  AlertTriangle, Plus, ChevronLeft, ChevronRight, Heart, MessageCircle,
  Send, Bookmark, MoreHorizontal, Repeat2, Library, Loader2, Pencil,
} from 'lucide-react';
import { PostType, Platform, Asset, Caption } from '@/types/models';
import { checkImageAspectRatios, ARCheckResult } from '@/lib/ar-checker';
import ImageEditor, { EditableImage, FilterState, OverlayItem, ImageEditorResult } from './ImageEditor';

// ─── Types ────────────────────────────────────────────────────────────────────

type PostFormat = 'carousel' | 'reels' | 'threads' | 'story' | 'x';

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  file?: File;
  filters?: FilterState;
  overlays?: OverlayItem[];
}

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

const PLATFORM_STYLE: Record<Platform, { label: string; icon: string; section: string; header: string; badge: string }> = {
  instagram: {
    label: 'Instagram', icon: '📸',
    section: 'border border-pink-500/25 bg-pink-500/5',
    header:  'bg-pink-500/15 border-b border-pink-500/25 text-pink-300',
    badge:   'bg-pink-500/15 border-pink-500/30 text-pink-300',
  },
  tiktok: {
    label: 'TikTok', icon: '🎵',
    section: 'border border-red-500/25 bg-red-500/5',
    header:  'bg-red-500/15 border-b border-red-500/25 text-red-300',
    badge:   'bg-red-500/15 border-red-500/30 text-red-300',
  },
  threads: {
    label: 'Threads', icon: '🧵',
    section: 'border border-purple-500/25 bg-purple-500/5',
    header:  'bg-purple-500/15 border-b border-purple-500/25 text-purple-300',
    badge:   'bg-purple-500/15 border-purple-500/30 text-purple-300',
  },
  x: {
    label: 'X', icon: '𝕏',
    section: 'border border-slate-500/25 bg-slate-800/30',
    header:  'bg-slate-700/40 border-b border-slate-600/30 text-slate-300',
    badge:   'bg-slate-700/30 border-slate-600/40 text-slate-300',
  },
  fanvue: {
    label: 'Fanvue', icon: '🎭',
    section: 'border border-orange-500/25 bg-orange-500/5',
    header:  'bg-orange-500/15 border-b border-orange-500/25 text-orange-300',
    badge:   'bg-orange-500/15 border-orange-500/30 text-orange-300',
  },
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
  const relevant = captions.filter((c) => c.postType === postType).slice(0, 6);
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
            className="text-[10px] bg-slate-800 border border-slate-700 hover:border-violet-500/50 hover:bg-violet-500/10 text-slate-300 hover:text-violet-300 px-2 py-1 rounded-lg transition-all text-left max-w-[180px] truncate"
            title={c.text}
          >
            {c.text.length > 35 ? c.text.substring(0, 35) + '…' : c.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── IG Preview Panel ─────────────────────────────────────────────────────────

function IGPreview({ mediaItems, format, description, modelName, modelEmoji, onDescriptionChange, reelCaption }: {
  mediaItems: MediaItem[]; format: PostFormat; description: string;
  modelName: string; modelEmoji: string; onDescriptionChange: (v: string) => void;
  reelCaption?: string;
}) {
  const [slide, setSlide] = useState(0);
  const handle = modelName.toLowerCase().replace(/\s/g, '_');
  const isReel = format === 'reels' || format === 'story';
  const current = mediaItems[slide];

  useEffect(() => { setSlide(0); }, [mediaItems.length]);

  return (
    <div className="bg-black rounded-2xl overflow-hidden border border-slate-700/60 w-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-sm flex-shrink-0">{modelEmoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold leading-tight">@{handle}</p>
          <p className="text-slate-500 text-[10px]">Just now</p>
        </div>
        <MoreHorizontal className="w-5 h-5 text-white" />
      </div>

      {/* Image */}
      <div className={`relative bg-slate-900 overflow-hidden ${isReel ? 'aspect-[9/16]' : 'aspect-square'}`}>
        {current ? (
          current.type === 'video'
            ? <div className="w-full h-full flex items-center justify-center"><Film className="w-10 h-10 text-slate-600" /></div>
            : <img src={current.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center"><ImageIcon className="w-10 h-10 text-slate-700 mx-auto mb-2" /><p className="text-slate-600 text-xs">Upload media to preview</p></div>
          </div>
        )}

        {/* Overlay items from editor */}
        {current?.overlays?.map((ov) => (
          <div
            key={ov.id}
            className="absolute pointer-events-none"
            style={{
              left: `${ov.x}%`, top: `${ov.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: ov.fontSize, fontFamily: ov.fontFamily,
              fontWeight: ov.bold ? 'bold' : 'normal',
              color: ov.color,
              textShadow: ov.shadow ? '1px 1px 4px rgba(0,0,0,0.9)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >{ov.content}</div>
        ))}

        {/* Reel caption overlay — text ON the video */}
        {isReel && reelCaption && (
          <div
            className="absolute inset-x-0 pointer-events-none"
            style={{ bottom: '15%' }}
          >
            <p
              className="text-white text-center font-bold leading-tight px-3"
              style={{
                fontSize: '11px',
                textShadow: '0 1px 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.9)',
                wordBreak: 'break-word',
              }}
            >
              {reelCaption}
            </p>
          </div>
        )}

        {/* Carousel nav */}
        {mediaItems.length > 1 && (
          <>
            {slide > 0 && <button type="button" onClick={() => setSlide(s => s - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"><ChevronLeft className="w-4 h-4 text-white" /></button>}
            {slide < mediaItems.length - 1 && <button type="button" onClick={() => setSlide(s => s + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"><ChevronRight className="w-4 h-4 text-white" /></button>}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {mediaItems.map((_, i) => <button key={i} type="button" onClick={() => setSlide(i)} className={`rounded-full transition-all ${i === slide ? 'w-3 h-1.5 bg-blue-400' : 'w-1.5 h-1.5 bg-white/50'}`} />)}
            </div>
            <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-white text-[10px] font-medium">{slide + 1}/{mediaItems.length}</div>
          </>
        )}
        {format === 'story' && <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/70 rounded-full" />}
      </div>

      {/* Actions + editable description */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4"><Heart className="w-6 h-6 text-white" /><MessageCircle className="w-6 h-6 text-white" /><Send className="w-6 h-6 text-white" /></div>
        <Bookmark className="w-6 h-6 text-white" />
      </div>
      <div className="px-3 pb-3">
        <p className="text-white text-xs font-semibold mb-1">1,234 likes</p>
        <p className="text-[10px] text-slate-400 mb-0.5">@{handle}</p>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={2}
          placeholder="Write a caption…"
          className="w-full bg-transparent text-xs text-slate-200 resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed"
        />
      </div>
    </div>
  );
}

// ─── TikTok Slide with text overlay ──────────────────────────────────────────

function TikTokSlide({ item, caption, onCaptionChange, onEdit, index, captions: libCaptions }: {
  item: MediaItem; caption: string; onCaptionChange: (v: string) => void;
  onEdit: () => void; index: number; captions: Caption[];
}) {
  const ttkLibrary = libCaptions.filter((c) => c.postType === 'tiktok_slideshow');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Slide {index + 1}</span>
      </div>

      <div className="flex gap-3 items-start">
        {/* Image with live text overlay */}
        <div className="relative flex-shrink-0 w-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-700" style={{ aspectRatio: '1' }}>
          {item.type === 'image' ? (
            <img src={item.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-slate-600" /></div>
          )}

          {/* Live caption overlay — actual text ON the image */}
          {caption && (
            <div
              className="absolute inset-x-0 bottom-0 px-1.5 py-1.5 flex items-end justify-center"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}
            >
              <p className="text-white text-[9px] font-bold text-center leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)', wordBreak: 'break-word' }}>
                {caption}
              </p>
            </div>
          )}

          {/* No-caption placeholder */}
          {!caption && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[8px] text-slate-600 text-center px-1">Add caption below</p>
            </div>
          )}

          {/* Edit button overlay */}
          <button
            type="button"
            onClick={onEdit}
            className="absolute top-1 right-1 w-6 h-6 bg-black/70 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/90 transition-colors"
            title="Edit image"
          >
            <Pencil className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* Caption input */}
        <div className="flex-1 min-w-0 space-y-2">
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            rows={3}
            placeholder={`Caption for slide ${index + 1}…\nThis text appears ON the image.`}
            className="input-dark resize-none text-sm py-2 w-full"
          />
          {/* Library picks */}
          {ttkLibrary.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ttkLibrary.slice(0, 4).map((c) => (
                <button key={c.id} type="button" onClick={() => onCaptionChange(c.text)}
                  className="text-[9px] bg-slate-800 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-300 px-1.5 py-0.5 rounded transition-all truncate max-w-[140px]"
                  title={c.text}
                >
                  {c.text.length > 28 ? c.text.substring(0, 28) + '…' : c.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Threads Preview ──────────────────────────────────────────────────────────

function ThreadsPreview({ mediaItems, description, modelName, modelEmoji, onDescriptionChange, captions }: {
  mediaItems: MediaItem[]; description: string; modelName: string; modelEmoji: string;
  onDescriptionChange: (v: string) => void; captions: Caption[];
}) {
  const handle = modelName.toLowerCase().replace(/\s/g, '_');
  return (
    <div className="bg-black rounded-2xl border border-slate-700/60 p-4 space-y-3 w-full">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-sm flex-shrink-0">{modelEmoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white text-sm font-semibold">@{handle}</p>
            <span className="text-slate-500 text-xs">Just now</span>
          </div>
          <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={3}
            placeholder="Start a thread…" className="w-full bg-transparent text-sm text-slate-200 resize-none focus:outline-none placeholder:text-slate-600" />
          {mediaItems[0] && (
            <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 aspect-square max-h-48">
              {mediaItems[0].type === 'image'
                ? <img src={mediaItems[0].url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Film className="w-8 h-8 text-slate-500" /></div>}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-slate-500">
            <Heart className="w-5 h-5" /><MessageCircle className="w-5 h-5" /><Repeat2 className="w-5 h-5" /><Send className="w-5 h-5" />
          </div>
        </div>
      </div>
      <LibraryPicks captions={captions} postType="threads_post" onSelect={onDescriptionChange} />
    </div>
  );
}

// ─── Platform Section Wrapper ─────────────────────────────────────────────────

function PlatformSection({ platform, children }: { platform: Platform; children: React.ReactNode }) {
  const s = PLATFORM_STYLE[platform];
  return (
    <div className={`rounded-xl overflow-hidden ${s.section}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 ${s.header}`}>
        <span className="text-base">{s.icon}</span>
        <span className="text-sm font-semibold">{s.label}</span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function CreatePostModal() {
  const {
    showCreatePostModal, setShowCreatePostModal,
    selectedModelId, models, addPost, captions,
    preloadedGalleryAssets, setPreloadedGalleryAssets,
  } = useStore();

  const model = models.find((m) => m.id === selectedModelId);

  const [format, setFormat] = useState<PostFormat>('carousel');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [slideCaptions, setSlideCaptions] = useState<string[]>([]);
  const [reelCaption, setReelCaption] = useState('');
  // Per-platform descriptions
  const [igDescription, setIgDescription] = useState('');
  const [tiktokDescription, setTiktokDescription] = useState('');
  const [threadsDescription, setThreadsDescription] = useState('');
  const [xDescription, setXDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [arWarning, setArWarning] = useState<ARCheckResult | null>(null);
  const [autoDetectNote, setAutoDetectNote] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiProvider, setAiProvider] = useState<'anthropic' | 'openai'>('anthropic');
  const [isDragging, setIsDragging] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: EditableImage; index: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDescription = (p: Platform) => {
    if (p === 'instagram') return igDescription;
    if (p === 'tiktok')    return tiktokDescription;
    if (p === 'threads')   return threadsDescription;
    return xDescription;
  };
  const setDescription = (p: Platform, v: string) => {
    if (p === 'instagram') setIgDescription(v);
    else if (p === 'tiktok')    setTiktokDescription(v);
    else if (p === 'threads')   setThreadsDescription(v);
    else setXDescription(v);
  };

  // Load preloaded gallery assets
  useEffect(() => {
    if (preloadedGalleryAssets.length > 0) {
      const items: MediaItem[] = preloadedGalleryAssets.map((a) => ({ id: a.id, url: a.fileUrl, name: a.fileName, type: a.fileType }));
      setMediaItems(items);
      setSlideCaptions(Array(items.length).fill(''));
      if (items.length > 1) { setFormat('carousel'); setAutoDetectNote(`${items.length} assets from gallery — Carousel + Slideshow.`); }
      else if (items.length === 1) setFormat(items[0].type === 'video' ? 'reels' : 'threads');
      setPreloadedGalleryAssets([]);
    }
  }, [preloadedGalleryAssets, setPreloadedGalleryAssets]);

  if (!showCreatePostModal) return null;

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const items: MediaItem[] = files.map((file, i) => ({
      id: `upload-${Date.now()}-${i}`, url: URL.createObjectURL(file), name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 'image', file,
    }));
    setMediaItems(items);
    setSlideCaptions(Array(items.length).fill(''));
    const isVideo = files[0].type.startsWith('video/');
    if (isVideo) {
      const ratio = await getVideoAspectRatio(files[0]);
      setFormat('reels');
      setAutoDetectNote(ratio && ratio < 0.62 ? '9:16 video detected — Reel format.' : 'Video detected — Reel format.');
    } else if (files.length === 1) {
      setFormat('threads'); setAutoDetectNote('Single image — Threads post.');
    } else {
      setFormat('carousel'); setAutoDetectNote(`${files.length} images — Carousel + TikTok Slideshow.`);
      const ar = await checkImageAspectRatios(files);
      setArWarning(ar.valid ? null : ar);
    }
  };

  const handleSlideCaption = (idx: number, val: string) => {
    setSlideCaptions((prev) => { const next = [...prev]; next[idx] = val; return next; });
  };

  const handleEditorDone = (result: ImageEditorResult) => {
    if (!editingItem) return;
    setMediaItems((prev) => prev.map((item, i) =>
      i === editingItem.index
        ? { ...item, url: result.url, filters: result.filters, overlays: result.overlays }
        : item
    ));
    setEditingItem(null);
  };

  const removeMedia = (idx: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== idx));
    setSlideCaptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGenerateCaptions = async () => {
    setIsGenerating(true);
    const primaryPlatform = FORMAT_CONFIG[format].platforms[0];
    const primaryPostType = FORMAT_CONFIG[format].postTypeMap[primaryPlatform]!;
    const relevantCaptions = captions.filter((c) => c.platform === primaryPlatform && c.postType === primaryPostType);
    try {
      const res = await fetch('/api/generate-captions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: primaryPlatform, postType: primaryPostType, exampleCaptions: relevantCaptions.map((c) => c.text), provider: aiProvider }),
      });
      const data = await res.json();
      setAiSuggestions(data.suggestions || []);
    } catch {
      setAiSuggestions(['New content dropping 💎', 'Check this out 🔥', "You don't want to miss this 👀"]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId || !scheduledDate) return;
    const cfg = FORMAT_CONFIG[format];
    cfg.platforms.forEach((platform) => {
      const pt = cfg.postTypeMap[platform]!;
      const assets: Asset[] = mediaItems.map((item, idx) => ({
        id: `asset-${Date.now()}-${platform}-${idx}`,
        postId: '',
        fileUrl: item.url,
        fileName: item.name,
        fileType: item.type,
        order: idx + 1,
        overlayConfig: (pt === 'tiktok_slideshow' && slideCaptions[idx])
          ? { text: slideCaptions[idx], position: { x: 50, y: 85 }, fontSize: 24, fontFamily: 'Arial', color: '#ffffff' }
          : (format === 'reels' && reelCaption)
          ? { text: reelCaption, position: { x: 50, y: 85 }, fontSize: 24, fontFamily: 'Arial', color: '#ffffff' }
          : undefined,
      }));
      addPost({
        id: `post-${Date.now()}-${platform}`,
        modelId: selectedModelId, platform, postType: pt,
        scheduledTime: `${scheduledDate}T${scheduledTime}:00`,
        status: 'scheduled',
        description: getDescription(platform),
        imageCaption: pt === 'tiktok_slideshow' ? slideCaptions[0] : undefined,
        assets, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    });
    setShowCreatePostModal(false);
    setIgDescription(''); setTiktokDescription(''); setThreadsDescription(''); setXDescription('');
    setSlideCaptions([]); setMediaItems([]); setAiSuggestions([]); setAutoDetectNote(null); setArWarning(null);
    setReelCaption(''); setFormat('carousel');
  };

  const cfg = FORMAT_CONFIG[format];
  const igPostType = FORMAT_TO_IG_POST_TYPE[format];

  // ─── If editor is open, render it full screen ─────────────────────────────
  if (editingItem) {
    return (
      <ImageEditor
        item={editingItem.item}
        initialFilters={mediaItems[editingItem.index]?.filters}
        initialOverlays={mediaItems[editingItem.index]?.overlays}
        onDone={handleEditorDone}
        onCancel={() => setEditingItem(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[93vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-700 px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Create Post</h2>
            {model && <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{model.profileImage} {model.name}</span>}
          </div>
          <button onClick={() => setShowCreatePostModal(false)} className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Tabs */}
        <div className="border-b border-slate-700/60 px-5 flex-shrink-0 overflow-x-auto no-scrollbar bg-slate-900">
          <div className="flex gap-0">
            {(Object.entries(FORMAT_CONFIG) as [PostFormat, typeof FORMAT_CONFIG[PostFormat]][]).map(([id, f]) => (
              <button key={id} type="button" onClick={() => setFormat(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${format === id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                <span>{f.emoji}</span>{f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col lg:flex-row">

              {/* ─── Left column ─── */}
              <div className="flex-1 p-5 space-y-5 lg:overflow-y-auto">
                {/* Format info */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>{cfg.description}</span>
                  {cfg.platforms.map((p) => (
                    <span key={p} className={`text-xs px-2 py-0.5 rounded-full border ${PLATFORM_STYLE[p].badge}`}>{PLATFORM_STYLE[p].icon} {PLATFORM_STYLE[p].label}</span>
                  ))}
                </div>

                {/* Upload zone */}
                <div>
                  <label className="label-dark">Media</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFilesSelected(Array.from(e.dataTransfer.files)); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-blue-400 bg-blue-500/10' : mediaItems.length > 0 ? 'border-green-500/40 bg-green-500/5' : 'border-slate-600 hover:border-slate-500 bg-slate-800/40'}`}
                  >
                    <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={(e) => handleFilesSelected(Array.from(e.target.files || []))} className="hidden" />
                    {mediaItems.length > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <Check className="w-6 h-6 text-green-400" />
                        <p className="text-green-400 text-sm font-medium">{mediaItems.length} file{mediaItems.length > 1 ? 's' : ''} ready</p>
                        <p className="text-slate-500 text-xs">Click to change</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-1">
                        <Upload className="w-8 h-8 text-slate-500" />
                        <p className="text-slate-300 text-sm font-medium">Drop files or click to upload</p>
                        <p className="text-slate-500 text-xs">Format auto-detected</p>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail strip */}
                  {mediaItems.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-1">
                      {mediaItems.map((item, i) => (
                        <div key={item.id} className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-700 group">
                          {item.type === 'image' ? <img src={item.url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Film className="w-5 h-5 text-slate-500" /></div>}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end justify-center gap-1 pb-1 opacity-0 group-hover:opacity-100">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setEditingItem({ item, index: i }); }}
                              className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center" title="Edit">
                              <Pencil className="w-2.5 h-2.5 text-white" />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeMedia(i); }}
                              className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center" title="Remove">
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          </div>
                          <span className="absolute top-0.5 left-0.5 text-[8px] bg-black/60 text-white px-1 rounded">{i + 1}</span>
                        </div>
                      ))}
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 w-14 h-14 rounded-lg border border-dashed border-slate-600 hover:border-slate-400 bg-slate-800/40 flex items-center justify-center transition-colors">
                        <Plus className="w-5 h-5 text-slate-500" />
                      </button>
                    </div>
                  )}

                  {autoDetectNote && (
                    <div className="mt-2 flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                      <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-blue-300 text-xs">{autoDetectNote}</p>
                    </div>
                  )}
                  {arWarning && !arWarning.valid && (
                    <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-400" /><p className="text-red-300 text-xs font-semibold">{arWarning.violations.length} image{arWarning.violations.length > 1 ? 's' : ''} need cropping — 1:1 or 4:5 only</p></div>
                      {arWarning.violations.map((v) => <p key={v.fileName} className="text-xs text-red-300/70 pl-6">{v.fileName} ({v.displayRatio})</p>)}
                      <button type="button" onClick={() => setArWarning(null)} className="text-xs text-red-400 underline mt-1">Dismiss</button>
                    </div>
                  )}
                </div>

                {/* ── Instagram Section ── */}
                {cfg.platforms.includes('instagram') && (
                  <PlatformSection platform="instagram">
                    <div className="space-y-3">
                      {format === 'reels' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <label className="label-dark text-xs">Caption (text on video)</label>
                            <span className="text-[10px] text-pink-400/70 bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.5 rounded-full">appears on screen</span>
                          </div>
                          <textarea
                            value={reelCaption} onChange={(e) => setReelCaption(e.target.value)}
                            rows={2} className="input-dark resize-none text-sm"
                            placeholder="Text that appears on the video…"
                          />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="label-dark text-xs">{format === 'reels' ? 'Post Description' : 'Caption / Description'}</label>
                        <textarea
                          value={igDescription} onChange={(e) => setIgDescription(e.target.value)}
                          rows={3} className="input-dark resize-none text-sm"
                          placeholder="What's on your mind for Instagram?"
                        />
                        <LibraryPicks captions={captions} postType={igPostType} onSelect={setIgDescription} />
                      </div>
                    </div>
                  </PlatformSection>
                )}

                {/* ── TikTok Section ── */}
                {cfg.platforms.includes('tiktok') && (
                  <PlatformSection platform="tiktok">
                    {format === 'carousel' ? (
                      /* Slideshow: per-slide caption ON the image */
                      <div className="space-y-4">
                        {mediaItems.length === 0 ? (
                          <p className="text-xs text-slate-500">Upload images above to add per-slide captions.</p>
                        ) : (
                          mediaItems.map((item, i) => (
                            <TikTokSlide
                              key={item.id}
                              item={item}
                              caption={slideCaptions[i] || ''}
                              onCaptionChange={(v) => handleSlideCaption(i, v)}
                              onEdit={() => setEditingItem({ item, index: i })}
                              index={i}
                              captions={captions}
                            />
                          ))
                        )}
                        <div className="border-t border-red-500/15 pt-3">
                          <label className="label-dark text-xs">TikTok Post Description</label>
                          <textarea
                            value={tiktokDescription} onChange={(e) => setTiktokDescription(e.target.value)}
                            rows={2} className="input-dark resize-none text-sm mt-1"
                            placeholder="TikTok post description (optional)…"
                          />
                          <LibraryPicks captions={captions} postType="tiktok_slideshow" onSelect={setTiktokDescription} />
                        </div>
                      </div>
                    ) : (
                      /* Reel: caption on video + post description */
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <label className="label-dark text-xs">Caption (text on video)</label>
                            <span className="text-[10px] text-red-400/70 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">appears on screen</span>
                          </div>
                          <textarea
                            value={reelCaption} onChange={(e) => setReelCaption(e.target.value)}
                            rows={2} className="input-dark resize-none text-sm"
                            placeholder="Text that appears on the video…"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="label-dark text-xs">Post Description</label>
                          <textarea
                            value={tiktokDescription} onChange={(e) => setTiktokDescription(e.target.value)}
                            rows={2} className="input-dark resize-none text-sm"
                            placeholder="TikTok post description…"
                          />
                          <LibraryPicks captions={captions} postType="tiktok_reel" onSelect={setTiktokDescription} />
                        </div>
                      </div>
                    )}
                  </PlatformSection>
                )}

                {/* ── Threads Section ── */}
                {cfg.platforms.includes('threads') && (
                  <PlatformSection platform="threads">
                    <div className="space-y-2">
                      <label className="label-dark text-xs">Thread Text</label>
                      <textarea
                        value={threadsDescription} onChange={(e) => setThreadsDescription(e.target.value)}
                        rows={3} className="input-dark resize-none text-sm"
                        placeholder="Start a thread…"
                      />
                      <LibraryPicks captions={captions} postType="threads_post" onSelect={setThreadsDescription} />
                    </div>
                  </PlatformSection>
                )}

                {/* ── X Section ── */}
                {cfg.platforms.includes('x') && (
                  <PlatformSection platform="x">
                    <div className="space-y-2">
                      <label className="label-dark text-xs">Tweet Text</label>
                      <textarea
                        value={xDescription} onChange={(e) => setXDescription(e.target.value)}
                        rows={3} className="input-dark resize-none text-sm"
                        placeholder="What's happening?"
                      />
                      <LibraryPicks captions={captions} postType="x_post" onSelect={setXDescription} />
                    </div>
                  </PlatformSection>
                )}

                {/* AI Suggestions */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <button type="button" onClick={handleGenerateCaptions} disabled={isGenerating}
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95">
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {isGenerating ? 'Generating…' : 'AI Suggestions'}
                    </button>
                    <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value as 'anthropic' | 'openai')}
                      className="bg-slate-800 border border-slate-600 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
                      <option value="anthropic">Claude</option>
                      <option value="openai">GPT-4</option>
                    </select>
                  </div>
                  {aiSuggestions.length > 0 && (
                    <div className="space-y-1.5">
                      {aiSuggestions.map((s, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 bg-violet-500/10 border border-violet-500/30 rounded-xl px-3 py-2.5">
                          <p className="text-slate-200 text-sm flex-1">{s}</p>
                          <button type="button" onClick={() => { setIgDescription(s); setTiktokDescription(s); }}
                            className="text-violet-400 hover:text-violet-300 font-medium text-xs flex-shrink-0 mt-0.5">Use All</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Schedule */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-dark">Date</label>
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required className="input-dark" />
                  </div>
                  <div>
                    <label className="label-dark">Time</label>
                    <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required className="input-dark" />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2 border-t border-slate-700">
                  <button type="button" onClick={() => setShowCreatePostModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">
                    Schedule{cfg.platforms.length > 1 ? ` (${cfg.platforms.length} posts)` : ' Post'}
                  </button>
                </div>
              </div>

              {/* ─── Right column: Live Preview ─── */}
              <div className="lg:w-72 xl:w-80 flex-shrink-0 p-5 border-t lg:border-t-0 lg:border-l border-slate-700/60 lg:overflow-y-auto space-y-3 bg-slate-900/50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Preview</p>
                {format === 'threads' ? (
                  <ThreadsPreview
                    mediaItems={mediaItems} description={threadsDescription}
                    modelName={model?.name || 'Model'} modelEmoji={model?.profileImage || '👤'}
                    onDescriptionChange={setThreadsDescription} captions={captions}
                  />
                ) : (
                  <IGPreview
                    mediaItems={mediaItems} format={format}
                    description={igDescription}
                    modelName={model?.name || 'Model'} modelEmoji={model?.profileImage || '👤'}
                    onDescriptionChange={setIgDescription}
                    reelCaption={reelCaption}
                  />
                )}

                {/* Platform badges */}
                <div className="flex flex-wrap gap-1.5">
                  {cfg.platforms.map((p) => (
                    <span key={p} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${PLATFORM_STYLE[p].badge}`}>
                      {PLATFORM_STYLE[p].icon} {PLATFORM_STYLE[p].label}
                    </span>
                  ))}
                </div>
                <div className="space-y-1">
                  {cfg.platforms.map((p) => (
                    <div key={p} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{PLATFORM_STYLE[p].label}</span>
                      <span className="text-slate-300 font-medium capitalize">{cfg.postTypeMap[p]?.replace(`${p}_`, '').replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
