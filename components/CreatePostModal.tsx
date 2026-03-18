'use client';

import { useStore } from '@/lib/store';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Sparkles, Upload, Check, Film,
  AlertTriangle, Loader2, Pencil, AlignLeft, AlignCenter, AlignRight, CalendarClock,
} from 'lucide-react';
import { addDays, startOfDay, setHours, setMinutes, format } from 'date-fns';
import { PostType, Platform, Caption } from '@/types/models';
import type { ARCheckResult, MediaItem } from '@/types/utils';
import ImageEditor, { ImageEditorResult } from './ImageEditor';
import { PLATFORM_THEMES } from '@/lib/constants/platform';
import {
  FontKey, StrokeKey, EDITOR_FONTS, EDITOR_STROKES, EDITOR_COLORS, getTextShadow,
} from '@/lib/constants/editor';

// ─── Platform → PostType mapping ─────────────────────────────────────────────

const PLATFORM_POST_TYPES: Record<Platform, { video: PostType; image: PostType }> = {
  instagram: { video: 'instagram_reel',   image: 'instagram_post'    },
  tiktok:    { video: 'tiktok_reel',      image: 'tiktok_slideshow'  },
  threads:   { video: 'threads_post',     image: 'threads_post'      },
  x:         { video: 'x_post',           image: 'x_post'            },
  fanvue:    { video: 'fanvue_post',      image: 'fanvue_post'       },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPlatformStyle = (platform: Platform) => {
  const theme = PLATFORM_THEMES[platform];
  const IconComponent = theme.icon;
  return {
    label: theme.label,
    icon: <IconComponent size={14} />,
    section: theme.bgDim.replace('bg-', 'border ').replace('/15', '/25') + ' ' + theme.bgDim,
    header: theme.bgDim + ' border-b ' + theme.border.replace('bg-', 'border-') + '/25 ' + theme.text,
    badge: theme.bgDim + ' border ' + theme.border.replace('bg-', 'border-') + '/30 ' + theme.text,
  };
};

// ─── Caption variation types ──────────────────────────────────────────────────

type VariationTexts = Record<Platform, { description: string; imageCaption: string }>;

function makeEmptyVariationTexts(): VariationTexts {
  return {
    instagram: { description: '', imageCaption: '' },
    tiktok:    { description: '', imageCaption: '' },
    threads:   { description: '', imageCaption: '' },
    x:         { description: '', imageCaption: '' },
    fanvue:    { description: '', imageCaption: '' },
  };
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
          {arCheck.violations[0]?.displayRatio ?? 'Bad ratio'}
        </div>
      )}

      {/* Index badge */}
      <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
    </div>
  );
}

// ─── Caption style ────────────────────────────────────────────────────────────

export interface CaptionStyle {
  font: FontKey;
  fontSize: number;
  stroke: StrokeKey;
  color: string;
  vAlign: 'top' | 'middle' | 'bottom';
  hAlign: 'left' | 'center' | 'right';
}

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  font: 'classic', fontSize: 20, stroke: 'light', color: '#FFFFFF',
  vAlign: 'bottom', hAlign: 'center',
};

const FONT_ORDER: FontKey[] = ['classic', 'modern', 'neon', 'typewriter', 'strong'];
const STROKE_ORDER: StrokeKey[] = ['none', 'light', 'bold', 'white'];

function positionToStyle(vAlign: CaptionStyle['vAlign'], hAlign: CaptionStyle['hAlign']): React.CSSProperties {
  const v = vAlign === 'top' ? { top: '8%' } : vAlign === 'bottom' ? { bottom: '8%' } : { top: '50%', transform: 'translateY(-50%)' };
  const textAlign = hAlign === 'left' ? 'left' : hAlign === 'right' ? 'right' : 'center';
  const h = hAlign === 'left' ? { left: '5%', right: '5%' } : hAlign === 'right' ? { right: '5%', left: '5%' } : { left: '5%', right: '5%' };
  return { position: 'absolute', ...v, ...h, textAlign, zIndex: 10 };
}

// ─── Platform Post Section ────────────────────────────────────────────────────

interface PlatformPostSectionProps {
  platform: Platform;
  postType: PostType;
  scheduledTime: string;
  onTimeChange: (time: string) => void;
  onNextSlot?: () => string;
  imageCaption: string;
  onImageCaptionChange: (text: string) => void;
  captionStyle: CaptionStyle;
  onCaptionStyleChange: (style: CaptionStyle) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  previewMediaUrl?: string;
  captions: Caption[];
}

function PlatformPostSection({
  platform,
  postType,
  scheduledTime,
  onTimeChange,
  onNextSlot,
  imageCaption,
  onImageCaptionChange,
  captionStyle,
  onCaptionStyleChange,
  description,
  onDescriptionChange,
  previewMediaUrl,
  captions,
}: PlatformPostSectionProps) {
  const style = getPlatformStyle(platform);
  const theme = PLATFORM_THEMES[platform];

  const patchStyle = (patch: Partial<CaptionStyle>) =>
    onCaptionStyleChange({ ...captionStyle, ...patch });

  const textShadow = getTextShadow(captionStyle.font, captionStyle.stroke, captionStyle.color);
  const fontCfg = EDITOR_FONTS[captionStyle.font];

  const libCaptions = captions.filter((c) => c.platform === platform).slice(0, 8);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiGenerate = async () => {
    if (libCaptions.length === 0) return;
    setAiLoading(true);
    try {
      const examples = libCaptions.map((c) => c.text).join('\n---\n');
      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, postType, examples, count: 1 }),
      });
      if (res.ok) {
        const json = await res.json();
        const generated: string = json.captions?.[0] ?? json.caption ?? '';
        if (generated) onDescriptionChange(generated);
      } else {
        onDescriptionChange(libCaptions[Math.floor(Math.random() * libCaptions.length)].text);
      }
    } catch {
      if (libCaptions.length > 0) {
        onDescriptionChange(libCaptions[Math.floor(Math.random() * libCaptions.length)].text);
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'var(--bg-card)' }}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${theme.bgDim} ${theme.text}`}>
          {style.icon} {style.label}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          · {postType.replace(platform + '_', '')}
        </span>
      </div>

      <div className="p-4 flex gap-4">
        {/* ── Controls (left) ── */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Time */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Schedule Time
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => onTimeChange(e.target.value)}
                className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              {onNextSlot && (
                <button
                  type="button"
                  onClick={() => {
                    const slot = onNextSlot();
                    if (slot) onTimeChange(slot);
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA' }}
                  title="Fill in the next available time slot from your posting schedule"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  Next slot
                </button>
              )}
            </div>
          </div>

          {/* Caption (image overlay) */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Caption <span style={{ color: 'var(--accent-violet)', opacity: 0.8 }}>(overlaid on image)</span>
            </label>
            <input
              type="text"
              value={imageCaption}
              onChange={(e) => onImageCaptionChange(e.target.value)}
              placeholder="Text displayed over the image…"
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: fontCfg.family,
                color: captionStyle.color,
                textShadow,
              }}
            />

            {/* Font picker */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              {FONT_ORDER.map((fk) => {
                const fc = EDITOR_FONTS[fk];
                const sel = captionStyle.font === fk;
                return (
                  <button
                    key={fk}
                    type="button"
                    onClick={() => patchStyle({ font: fk })}
                    className="flex-shrink-0 w-12 h-10 rounded-lg flex items-center justify-center text-base font-bold transition-all"
                    style={{
                      fontFamily: fc.family,
                      fontWeight: fc.weight,
                      background: sel ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${sel ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      color: '#fff',
                      textShadow: fk === 'neon' ? '0 0 8px #A78BFA' : undefined,
                      ...fc.extraStyle,
                    }}
                    title={fc.label}
                  >
                    Aa
                  </button>
                );
              })}
            </div>

            {/* Stroke + color row */}
            <div className="flex items-center gap-3 mt-2">
              {/* Stroke */}
              <div className="flex gap-1">
                {STROKE_ORDER.map((sk) => {
                  const sel = captionStyle.stroke === sk;
                  return (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => patchStyle({ stroke: sk })}
                      title={EDITOR_STROKES[sk].label}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                      style={{
                        background: sel ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.05)',
                        border: `1.5px solid ${sel ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                        color: '#fff',
                        fontFamily: fontCfg.family,
                        textShadow: EDITOR_STROKES[sk].preview,
                      }}
                    >
                      T
                    </button>
                  );
                })}
              </div>

              {/* Colors */}
              <div className="flex gap-1 flex-1">
                {EDITOR_COLORS.slice(0, 5).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patchStyle({ color: c })}
                    className="w-5 h-5 rounded-full flex-shrink-0 transition-transform"
                    style={{
                      background: c,
                      border: captionStyle.color === c ? '2px solid white' : '2px solid rgba(255,255,255,0.12)',
                      transform: captionStyle.color === c ? 'scale(1.25)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>

              {/* Size */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="range"
                  min={12}
                  max={48}
                  value={captionStyle.fontSize}
                  onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })}
                  className="w-16 accent-violet-500"
                />
                <span className="text-[10px] text-zinc-500 w-5">{captionStyle.fontSize}</span>
              </div>
            </div>

            {/* Position 3×1 alignment */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Position</span>
              <div className="toggle-group">
                {(['top', 'middle', 'bottom'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patchStyle({ vAlign: v })}
                    className={`toggle-item text-[10px] px-2 capitalize ${captionStyle.vAlign === v ? 'toggle-item-active' : ''}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="toggle-group">
                {([
                  { v: 'left'   as const, Icon: AlignLeft   },
                  { v: 'center' as const, Icon: AlignCenter },
                  { v: 'right'  as const, Icon: AlignRight  },
                ]).map(({ v, Icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patchStyle({ hAlign: v })}
                    className={`toggle-item px-2 ${captionStyle.hAlign === v ? 'toggle-item-active' : ''}`}
                  >
                    <Icon className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description (post body) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                Description <span style={{ opacity: 0.6 }}>(post body)</span>
              </label>
              <div className="flex items-center gap-2">
                {libCaptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onDescriptionChange(libCaptions[Math.floor(Math.random() * libCaptions.length)].text)}
                    className="text-[10px] flex items-center gap-1 transition-colors hover:text-violet-400"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Sparkles className="w-3 h-3" />
                    Pick from library
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiLoading || libCaptions.length === 0}
                  className="text-[10px] flex items-center gap-1 transition-colors hover:text-violet-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: 'var(--accent-violet)' }}
                  title={libCaptions.length === 0 ? 'Add captions to library first' : 'Generate in the style of your library'}
                >
                  {aiLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  AI Generate
                </button>
              </div>
            </div>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              placeholder={`Write your ${style.label} post body, hashtags, etc…`}
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none resize-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        {/* ── Mini overlay preview (right) ── */}
        <div className="flex-shrink-0 w-28">
          <p className="text-[9px] uppercase tracking-wider mb-1.5 text-center" style={{ color: 'var(--text-muted)' }}>Preview</p>
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '4/5', background: 'var(--bg-elevated)' }}>
            {previewMediaUrl ? (
              <img src={previewMediaUrl} alt="" className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="w-full h-full" style={{ background: 'linear-gradient(160deg, #FDE68A 0%, #F97316 40%, #EC4899 70%, #A855F7 100%)' }} />
            )}
            {imageCaption && (
              <div
                style={{
                  ...positionToStyle(captionStyle.vAlign, captionStyle.hAlign),
                  fontFamily: fontCfg.family,
                  fontSize: Math.max(8, captionStyle.fontSize * 0.42),
                  fontWeight: fontCfg.weight,
                  color: captionStyle.color,
                  textShadow,
                  lineHeight: 1.25,
                  padding: '0 4px',
                  wordBreak: 'break-word',
                  ...fontCfg.extraStyle,
                }}
              >
                {imageCaption}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main CreatePostModal ─────────────────────────────────────────────────────

interface CreatePostModalProps {
  onClose?: () => void;
}

export default function CreatePostModal({ onClose }: CreatePostModalProps) {
  const { setShowCreatePostModal } = useStore();

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setShowCreatePostModal(false);
    }
  }, [onClose, setShowCreatePostModal]);

  const { models, selectedModelId, captions, posts, addPost, editingPost, setEditingPost } = useStore();
  const selectedModel = models.find((m) => m.id === selectedModelId);

  // Compute next available slot for a platform based on model schedule + existing posts
  const getNextSlot = useCallback((platform: Platform): string => {
    if (!selectedModel) return '';
    const slots = selectedModel.postingSchedule.filter((s) => s.platform === platform);
    if (slots.length === 0) return '';
    const now = new Date();
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = addDays(startOfDay(now), dayOffset);
      const dow = date.getDay();
      const isWeekday = dow >= 1 && dow <= 5;
      const isWeekend = dow === 0 || dow === 6;
      for (const slot of slots) {
        if (slot.recurrence === 'weekdays' && !isWeekday) continue;
        if (slot.recurrence === 'weekends' && !isWeekend) continue;
        const [h, m] = slot.time.split(':').map(Number);
        const slotTime = setMinutes(setHours(date, h), m);
        if (slotTime <= now) continue;
        const slotStr = format(slotTime, "yyyy-MM-dd'T'HH:mm");
        const occupied = posts.some(
          (p) =>
            p.modelId === selectedModel.id &&
            p.platform === platform &&
            p.scheduledTime.slice(0, 16) === slotStr &&
            (p.status === 'scheduled' || p.status === 'draft')
        );
        if (!occupied) return slotStr;
      }
    }
    return '';
  }, [selectedModel, posts]);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [arCheckResults, setArCheckResults] = useState<Record<number, ARCheckResult>>({});

  // Platform scheduling config (no caption text here)
  const [platformData, setPlatformData] = useState<Record<Platform, {
    scheduledTime: string;
    captionStyle: CaptionStyle;
    enabled: boolean;
  }>>({
    instagram: { scheduledTime: '', captionStyle: DEFAULT_CAPTION_STYLE, enabled: false },
    tiktok:    { scheduledTime: '', captionStyle: DEFAULT_CAPTION_STYLE, enabled: false },
    threads:   { scheduledTime: '', captionStyle: DEFAULT_CAPTION_STYLE, enabled: false },
    x:         { scheduledTime: '', captionStyle: DEFAULT_CAPTION_STYLE, enabled: false },
    fanvue:    { scheduledTime: '', captionStyle: DEFAULT_CAPTION_STYLE, enabled: false },
  });

  // Caption variations for A/B testing
  const [captionVariations, setCaptionVariations] = useState<Array<{
    id: string;
    label: string;
    texts: VariationTexts;
  }>>([{ id: 'v1', label: 'A', texts: makeEmptyVariationTexts() }]);
  const [activeVarIdx, setActiveVarIdx] = useState(0);
  const [unifiedMode, setUnifiedMode] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [editingItem, setEditingItem] = useState<{ index: number; item: MediaItem } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  // Initialize from editing post
  useEffect(() => {
    if (editingPost) {
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
        instagram: { scheduledTime: editingPost.scheduledTime.slice(0, 16), captionStyle: DEFAULT_CAPTION_STYLE, enabled: editingPost.platform === 'instagram' },
        tiktok:    { scheduledTime: editingPost.scheduledTime.slice(0, 16), captionStyle: DEFAULT_CAPTION_STYLE, enabled: editingPost.platform === 'tiktok'    },
        threads:   { scheduledTime: editingPost.scheduledTime.slice(0, 16), captionStyle: DEFAULT_CAPTION_STYLE, enabled: editingPost.platform === 'threads'   },
        x:         { scheduledTime: editingPost.scheduledTime.slice(0, 16), captionStyle: DEFAULT_CAPTION_STYLE, enabled: editingPost.platform === 'x'         },
        fanvue:    { scheduledTime: '', captionStyle: DEFAULT_CAPTION_STYLE, enabled: false },
      });
      setCaptionVariations([{
        id: 'v1',
        label: 'A',
        texts: {
          instagram: { description: editingPost.description, imageCaption: editingPost.imageCaption ?? '' },
          tiktok:    { description: editingPost.description, imageCaption: editingPost.imageCaption ?? '' },
          threads:   { description: editingPost.description, imageCaption: editingPost.imageCaption ?? '' },
          x:         { description: editingPost.description, imageCaption: editingPost.imageCaption ?? '' },
          fanvue:    { description: '', imageCaption: '' },
        },
      }]);
      setActiveVarIdx(0);
    }
  }, [editingPost]);

  // ── Variation helpers ──────────────────────────────────────────────────────

  const getVarText = useCallback((platform: Platform) =>
    captionVariations[activeVarIdx].texts[platform],
  [captionVariations, activeVarIdx]);

  const setVarText = useCallback((platform: Platform, field: 'description' | 'imageCaption', value: string) => {
    setCaptionVariations(prev => {
      const next = [...prev];
      const variation = { ...next[activeVarIdx], texts: { ...next[activeVarIdx].texts } };
      if (unifiedMode) {
        const allEnabled = (['instagram', 'tiktok', 'threads', 'x'] as Platform[]).filter(p => platformData[p].enabled);
        for (const p of allEnabled) {
          variation.texts[p] = { ...variation.texts[p], [field]: value };
        }
      } else {
        variation.texts[platform] = { ...variation.texts[platform], [field]: value };
      }
      next[activeVarIdx] = variation;
      return next;
    });
  }, [captionVariations, activeVarIdx, unifiedMode, platformData]);

  const addVariation = useCallback(() => {
    const newId = `v${captionVariations.length + 1}`;
    const label = String.fromCharCode(65 + captionVariations.length); // A, B, C...
    const cloned: VariationTexts = JSON.parse(JSON.stringify(captionVariations[activeVarIdx].texts));
    setCaptionVariations(prev => [...prev, { id: newId, label, texts: cloned }]);
    setActiveVarIdx(captionVariations.length);
  }, [captionVariations, activeVarIdx]);

  // ── File upload ────────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setUploading(true);
      const newItems: MediaItem[] = [];

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

        if (!isVideo) {
          const itemIndex = mediaItems.length + newItems.length;
          const img = new globalThis.Image();
          img.onload = () => {
            try {
              const ratio = img.width / img.height;
              const SUPPORTED = [1.0, 0.8];
              const TOLERANCE = 0.03;
              const valid = SUPPORTED.some((r) => Math.abs(ratio - r) <= TOLERANCE);
              if (!valid) {
                const displayRatio = ratio > 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`;
                setArCheckResults((prev) => ({
                  ...prev,
                  [itemIndex]: { valid: false, violations: [{ fileName: file.name, width: img.width, height: img.height, actualRatio: ratio, displayRatio }] },
                }));
              }
            } catch (error) {
              console.error('AR check failed:', error);
            }
          };
          img.src = url;
        }

        newItems.push(item);
      }

      const allItems = [...mediaItems, ...newItems];
      setMediaItems(allItems);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Enable Instagram and TikTok by default on first upload
      if (mediaItems.length === 0 && newItems.length > 0) {
        setPlatformData((prev) => ({
          ...prev,
          instagram: { ...prev.instagram, enabled: true },
          tiktok:    { ...prev.tiktok,    enabled: true },
        }));
      }
    },
    [mediaItems]
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

  // ── Schedule ───────────────────────────────────────────────────────────────

  const handleScheduleAll = useCallback(async () => {
    if (!selectedModel) return;

    setScheduling(true);
    const hasVideo = mediaItems.some((i) => i.type === 'video');
    const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'threads', 'x'];

    // Schedule post for each enabled platform × each variation
    for (const variation of captionVariations) {
      for (const platform of PLATFORMS) {
        const config = platformData[platform];
        if (!config.enabled || !config.scheduledTime) continue;

        const postType = PLATFORM_POST_TYPES[platform][hasVideo ? 'video' : 'image'];
        const texts = variation.texts[platform];

        const newPost = {
          id: `post-${Date.now()}-${platform}-${variation.id}`,
          modelId: selectedModel.id,
          platform,
          postType,
          scheduledTime: config.scheduledTime + ':00',
          status: 'scheduled' as const,
          description: texts.description,
          imageCaption: texts.imageCaption || undefined,
          assets: mediaItems.map((item, idx) => ({
            id: `asset-${Date.now()}-${idx}`,
            postId: '',
            fileUrl: item.url,
            fileName: item.name,
            fileType: item.type,
            order: idx + 1,
          })),
          createdAt: editingPost?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        addPost(newPost);
      }
    }

    setScheduling(false);
    setEditingPost(null);
    handleClose();
  }, [selectedModel, platformData, captionVariations, mediaItems, editingPost, addPost, setEditingPost, handleClose]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const hasAnyMedia = mediaItems.length > 0;
  const hasInvalidAr = Object.values(arCheckResults).some((r) => !r.valid);
  const enabledPlatforms = (['instagram', 'tiktok', 'threads', 'x'] as Platform[]).filter((p) => platformData[p].enabled);
  const totalPosts = enabledPlatforms.length * captionVariations.length;

  // Memoised so PlatformPostSection renders don't re-derive this
  const hasVideo = useMemo(() => mediaItems.some((i) => i.type === 'video'), [mediaItems]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  }, [handleClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  }, [handleClose]);

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
          <button onClick={handleClose} className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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

          {/* Platform Selection */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block">Publish To</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['instagram', 'tiktok', 'threads', 'x'] as Platform[]).map((platform) => {
                const typeLabel = platform === 'instagram' ? (hasVideo ? 'Reel' : 'Post')
                                : platform === 'tiktok'    ? (hasVideo ? 'Reel' : 'Slideshow')
                                : platform === 'threads'   ? 'Post'
                                : 'Post';
                const theme = PLATFORM_THEMES[platform];
                const IconComp = theme.icon;
                const enabled = platformData[platform].enabled;
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setPlatformData((prev) => ({ ...prev, [platform]: { ...prev[platform], enabled: !prev[platform].enabled } }))}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      enabled
                        ? 'border-violet-500/60 bg-violet-600/15 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <IconComp size={24} />
                    <span className="text-xs font-semibold capitalize">{platform === 'x' ? 'X (Twitter)' : platform}</span>
                    <span className="text-[10px] opacity-60">{typeLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platform Captions */}
          <div>
            {/* Section header with variation tabs and unified toggle */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <label className="text-sm font-semibold text-white">Platform Captions</label>
              <div className="flex items-center gap-2">
                {/* Unified toggle */}
                <button
                  type="button"
                  onClick={() => setUnifiedMode(v => !v)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                    unifiedMode
                      ? 'border-violet-500/60 bg-violet-600/15 text-violet-300'
                      : 'border-white/10 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  <Check className={`w-3 h-3 ${unifiedMode ? 'opacity-100' : 'opacity-0'}`} />
                  Same for all
                </button>
              </div>
            </div>

            {/* Variation tabs */}
            {enabledPlatforms.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {captionVariations.map((v, idx) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveVarIdx(idx)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                      activeVarIdx === idx
                        ? 'border-violet-500/60 bg-violet-600/20 text-white'
                        : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300'
                    }`}
                  >
                    Version {v.label}
                  </button>
                ))}
                {captionVariations.length < 5 && (
                  <button
                    type="button"
                    onClick={addVariation}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-white/15 text-zinc-500 hover:border-violet-500/40 hover:text-violet-400 transition-all"
                    title="Add caption variation for A/B testing"
                  >
                    + Add variation
                  </button>
                )}
                {captionVariations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCaptionVariations(prev => prev.filter((_, i) => i !== activeVarIdx));
                      setActiveVarIdx(Math.max(0, activeVarIdx - 1));
                    }}
                    className="text-xs px-2 py-1.5 rounded-lg border border-white/10 text-zinc-600 hover:border-red-500/40 hover:text-red-400 transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}

            {/* Platform sections */}
            <div className="flex flex-col gap-4">
              {(['instagram', 'tiktok', 'threads', 'x'] as Platform[]).filter((p) => platformData[p].enabled).map((platform) => {
                const postType = PLATFORM_POST_TYPES[platform][hasVideo ? 'video' : 'image'];
                return (
                  <PlatformPostSection
                    key={`${platform}-${activeVarIdx}`}
                    platform={platform}
                    postType={postType}
                    scheduledTime={platformData[platform].scheduledTime}
                    onTimeChange={(time) => setPlatformData((prev) => ({ ...prev, [platform]: { ...prev[platform], scheduledTime: time } }))}
                    onNextSlot={() => getNextSlot(platform)}
                    imageCaption={getVarText(platform).imageCaption}
                    onImageCaptionChange={(text) => setVarText(platform, 'imageCaption', text)}
                    captionStyle={platformData[platform].captionStyle}
                    onCaptionStyleChange={(style) => setPlatformData((prev) => ({ ...prev, [platform]: { ...prev[platform], captionStyle: style } }))}
                    description={getVarText(platform).description}
                    onDescriptionChange={(text) => setVarText(platform, 'description', text)}
                    previewMediaUrl={mediaItems[0]?.type === 'image' ? mediaItems[0]?.url : undefined}
                    captions={captions}
                  />
                );
              })}
            </div>
          </div>

          {/* Schedule Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button type="button" onClick={handleClose} className="btn-secondary text-sm py-2 px-4">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleScheduleAll}
              disabled={!hasAnyMedia || hasInvalidAr || scheduling || enabledPlatforms.length === 0 || Object.values(platformData).every(p => !p.enabled || !p.scheduledTime)}
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
                  Schedule {totalPosts} Post{totalPosts !== 1 ? 's' : ''}
                  {captionVariations.length > 1 && (
                    <span className="text-[10px] opacity-70">({captionVariations.length} variations × {enabledPlatforms.length} platforms)</span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Editor Modal */}
      {editingItem && (
        <ImageEditor
          item={{ id: editingItem.item.id, url: editingItem.item.url, name: editingItem.item.name, type: editingItem.item.type }}
          onDone={handleImageEditorSave}
          onCancel={handleImageEditorClose}
          initialFilters={editingItem.item.filters}
          initialOverlays={editingItem.item.overlays}
        />
      )}
    </div>
  );
}
