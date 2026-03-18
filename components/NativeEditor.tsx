'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Type, Smile, SlidersHorizontal, Crop } from 'lucide-react';
import {
  FontKey, StrokeKey, CropRatio, EDITOR_FONTS, EDITOR_STROKES, EDITOR_COLORS,
  FILTER_SWATCH, FILTERS, getTextShadow,
} from '@/lib/constants/editor';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontKey: FontKey;
  fontSize: number;
  color: string;
  stroke: StrokeKey;
}

interface EmojiLayer {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

export interface EditorResult {
  filter: string;
  filterLabel: string;
  textLayers: TextLayer[];
  emojiLayers: EmojiLayer[];
  cropRatio: CropRatio;
  cropOffset: { x: number; y: number };
  renderedUrl?: string;
}

interface NativeEditorProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  initialResult?: EditorResult;
  onSave: (result: EditorResult) => void;
  onClose: () => void;
}

// ─── Local constants ──────────────────────────────────────────────────────────

type ToolTab = 'filter' | 'text' | 'emoji' | 'crop';

const EMOJI_LIST = [
  '❤️', '🔥', '✨', '💫', '🎉', '😍', '🥰', '😎', '🤩', '💕',
  '💯', '🙌', '👀', '💪', '🌟', '🎯', '🚀', '💃', '🎵', '🌙',
  '☀️', '🌈', '🦋', '🍀', '💎', '👑', '🌸', '🎀', '🤍', '💋',
];

const CROP_OPTIONS: { label: string; value: CropRatio; w: number; h: number }[] = [
  { label: 'Original', value: 'original', w: 44, h: 44 },
  { label: '1:1',      value: '1:1',      w: 44, h: 44 },
  { label: '4:5',      value: '4:5',      w: 40, h: 50 },
  { label: '9:16',     value: '9:16',     w: 32, h: 57 },
];

const CROP_ASPECT: Record<CropRatio, string> = {
  original: '4 / 5',
  '1:1':    '1 / 1',
  '4:5':    '4 / 5',
  '9:16':   '9 / 16',
};

const TABS: { tab: ToolTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { tab: 'filter', label: 'Filter', Icon: SlidersHorizontal },
  { tab: 'text',   label: 'Text',   Icon: Type               },
  { tab: 'emoji',  label: 'Emoji',  Icon: Smile              },
  { tab: 'crop',   label: 'Crop',   Icon: Crop               },
];

const STROKE_ORDER: StrokeKey[] = ['none', 'light', 'bold', 'white'];
const FONT_ORDER: FontKey[] = ['classic', 'modern', 'neon', 'typewriter', 'strong'];

// ─── Main component ───────────────────────────────────────────────────────────

export default function NativeEditor({ mediaUrl, mediaType, initialResult, onSave, onClose }: NativeEditorProps) {
  const [activeTab, setActiveTab]           = useState<ToolTab>('filter');
  const [filter, setFilter]                 = useState(initialResult?.filter ?? 'none');
  const [filterLabel, setFilterLabel]       = useState(initialResult?.filterLabel ?? 'Normal');
  const [cropRatio, setCropRatio]           = useState<CropRatio>(initialResult?.cropRatio ?? 'original');
  const [cropOffset, setCropOffset]         = useState(initialResult?.cropOffset ?? { x: 50, y: 50 });
  const [textLayers, setTextLayers]         = useState<TextLayer[]>(initialResult?.textLayers ?? []);
  const [emojiLayers, setEmojiLayers]       = useState<EmojiLayer[]>(initialResult?.emojiLayers ?? []);
  const [newText, setNewText]               = useState('');
  const [selectedFont, setSelectedFont]     = useState<FontKey>('classic');
  const [selectedColor, setSelectedColor]   = useState('#FFFFFF');
  const [selectedStroke, setSelectedStroke] = useState<StrokeKey>('light');
  const [fontSize, setFontSize]             = useState(24);

  const mediaAreaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    type: 'text' | 'emoji';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const cropDragRef = useRef<{
    startX: number;
    startY: number;
    startOx: number;
    startOy: number;
  } | null>(null);

  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    cropDragRef.current = { startX: e.clientX, startY: e.clientY, startOx: cropOffset.x, startOy: cropOffset.y };
  }, [cropOffset]);

  const handleAddText = useCallback(() => {
    if (!newText.trim()) return;
    setTextLayers((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}`,
        text: newText.trim(),
        x: 50, y: 50,
        fontKey: selectedFont,
        fontSize,
        color: selectedColor,
        stroke: selectedStroke,
      },
    ]);
    setNewText('');
  }, [newText, selectedFont, fontSize, selectedColor, selectedStroke]);

  const handleAddEmoji = useCallback((emoji: string) => {
    setEmojiLayers((prev) => [...prev, { id: `e-${Date.now()}`, emoji, x: 50, y: 45, size: 42 }]);
    setActiveTab('filter');
  }, []);

  const handleLayerDown = useCallback(
    (e: React.MouseEvent, id: string, type: 'text' | 'emoji', x: number, y: number) => {
      e.preventDefault();
      dragRef.current = { id, type, startX: e.clientX, startY: e.clientY, origX: x, origY: y };
    },
    []
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Crop pan
    const cd = cropDragRef.current;
    if (cd && mediaAreaRef.current) {
      const rect = mediaAreaRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(100, cd.startOx - ((e.clientX - cd.startX) / rect.width) * 100));
      const newY = Math.max(0, Math.min(100, cd.startOy - ((e.clientY - cd.startY) / rect.height) * 100));
      setCropOffset({ x: newX, y: newY });
      return;
    }
    // Layer drag
    const d = dragRef.current;
    if (!d || !mediaAreaRef.current) return;
    const rect = mediaAreaRef.current.getBoundingClientRect();
    const nx = Math.max(5, Math.min(95, d.origX + ((e.clientX - d.startX) / rect.width) * 100));
    const ny = Math.max(5, Math.min(95, d.origY + ((e.clientY - d.startY) / rect.height) * 100));
    if (d.type === 'text') {
      setTextLayers((prev) => prev.map((l) => (l.id === d.id ? { ...l, x: nx, y: ny } : l)));
    } else {
      setEmojiLayers((prev) => prev.map((l) => (l.id === d.id ? { ...l, x: nx, y: ny } : l)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    cropDragRef.current = null;
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  // Build a same-origin URL for canvas use — proxies R2 signed URLs through our API
  const canvasMediaUrl = (() => {
    try {
      const u = new URL(mediaUrl);
      if (u.hostname.includes('r2.cloudflarestorage.com') || u.hostname.includes('r2.dev')) {
        const key = decodeURIComponent(u.pathname.slice(1));
        return `/api/r2/proxy?key=${encodeURIComponent(key)}`;
      }
    } catch { /* relative or blob URL — use as-is */ }
    return mediaUrl;
  })();

  const handleDone = useCallback(async () => {
    const hasLayers = textLayers.length > 0 || emojiLayers.length > 0;
    const hasFilter = filter && filter !== 'none';
    const hasCrop = cropRatio !== 'original' || cropOffset.x !== 50 || cropOffset.y !== 50;
    const mediaAreaEl = mediaAreaRef.current;

    if ((hasLayers || hasFilter || hasCrop) && mediaType === 'image' && mediaAreaEl) {
      setIsSaving(true);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = canvasMediaUrl;
        });

        // ── Crop math: mirror CSS object-cover + object-position ──────────
        const cropAspects: Record<CropRatio, number> = {
          original: 4 / 5, '1:1': 1, '4:5': 4 / 5, '9:16': 9 / 16,
        };
        const cropAspect = cropAspects[cropRatio];
        const imgAspect = img.naturalWidth / img.naturalHeight;

        let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;

        if (imgAspect > cropAspect) {
          // Image wider than crop — overflow on X axis
          srcH = img.naturalHeight;
          srcW = Math.round(srcH * cropAspect);
          const overflowX = img.naturalWidth - srcW;
          srcX = Math.round((cropOffset.x / 100) * overflowX);
        } else {
          // Image taller than crop — overflow on Y axis
          srcW = img.naturalWidth;
          srcH = Math.round(srcW / cropAspect);
          const overflowY = img.naturalHeight - srcH;
          srcY = Math.round((cropOffset.y / 100) * overflowY);
        }

        const canvas = document.createElement('canvas');
        canvas.width = srcW;
        canvas.height = srcH;
        const ctx = canvas.getContext('2d')!;
        const mediaHeight = mediaAreaEl.clientHeight;
        const scaleF = srcH / mediaHeight;

        if (hasFilter) ctx.filter = filter;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        for (const layer of textLayers) {
          const font = EDITOR_FONTS[layer.fontKey];
          const scaledSize = layer.fontSize * scaleF;
          const cx = (layer.x / 100) * canvas.width;
          const cy = (layer.y / 100) * canvas.height;

          ctx.font = `${font.weight} ${scaledSize}px ${font.family}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Stroke layer
          if (layer.stroke === 'light') {
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.lineWidth = scaledSize * 0.06;
            ctx.strokeText(layer.text, cx, cy);
          } else if (layer.stroke === 'bold') {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = scaledSize * 0.12;
            ctx.strokeText(layer.text, cx, cy);
          } else if (layer.stroke === 'white') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = scaledSize * 0.06;
            ctx.strokeText(layer.text, cx, cy);
          }

          if (layer.fontKey === 'neon') {
            ctx.shadowColor = layer.color;
            ctx.shadowBlur  = scaledSize * 0.5;
          } else {
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur  = scaledSize * 0.12;
          }
          ctx.fillStyle = layer.color;
          ctx.fillText(layer.text, cx, cy);
          ctx.shadowBlur = 0;
        }

        for (const layer of emojiLayers) {
          const scaledSize = layer.size * scaleF;
          const cx = (layer.x / 100) * canvas.width;
          const cy = (layer.y / 100) * canvas.height;
          ctx.font = `${scaledSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(layer.emoji, cx, cy);
        }

        const renderedUrl = canvas.toDataURL('image/jpeg', 0.92);
        setIsSaving(false);
        onSave({ filter, filterLabel, textLayers, emojiLayers, cropRatio, cropOffset, renderedUrl });
        return;
      } catch (err) {
        console.error('[NativeEditor] canvas bake failed:', err);
        setIsSaving(false);
      }
    }

    onSave({ filter, filterLabel, textLayers, emojiLayers, cropRatio, cropOffset });
  }, [filter, filterLabel, textLayers, emojiLayers, cropRatio, cropOffset, canvasMediaUrl, mediaType, onSave]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#000' }}>

      {/* ── Top bar ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 py-3.5"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <X className="w-5 h-5" />
        </button>
        <span className="text-white text-sm font-semibold tracking-tight">Edit</span>
        <button
          onClick={handleDone}
          disabled={isSaving}
          className="px-5 py-1.5 rounded-full text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'var(--accent-violet)' }}
        >
          {isSaving ? 'Saving…' : 'Done'}
        </button>
      </div>

      {/* ── Media area — fills all remaining space ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-black">
        <div
          ref={mediaAreaRef}
          className="relative overflow-hidden"
          style={{
            aspectRatio: CROP_ASPECT[cropRatio],
            height: '100%',
            maxWidth: '100%',
            cursor: dragRef.current ? 'grabbing' : 'default',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {mediaType === 'image' ? (
            <img
              src={mediaUrl}
              alt=""
              draggable={false}
              className="w-full h-full object-cover select-none"
              style={{
                filter: filter !== 'none' ? filter : undefined,
                objectPosition: `${cropOffset.x}% ${cropOffset.y}%`,
              }}
            />
          ) : (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
              style={{
                filter: filter !== 'none' ? filter : undefined,
                objectPosition: `${cropOffset.x}% ${cropOffset.y}%`,
              }}
              autoPlay
              loop
              muted
              playsInline
            />
          )}

          {/* Crop drag overlay — transparent layer that captures drag to pan the image */}
          {activeTab === 'crop' && (
            <div
              className="absolute inset-0"
              style={{ zIndex: 5, cursor: cropDragRef.current ? 'grabbing' : 'grab' }}
              onMouseDown={handleCropMouseDown}
            />
          )}

          {/* Text overlays */}
          {textLayers.map((layer) => {
            const cfg = EDITOR_FONTS[layer.fontKey];
            return (
              <div
                key={layer.id}
                className="absolute select-none"
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontFamily: cfg.family,
                  fontSize: layer.fontSize,
                  fontWeight: cfg.weight,
                  color: layer.color,
                  textShadow: getTextShadow(layer.fontKey, layer.stroke, layer.color),
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  cursor: 'grab',
                  userSelect: 'none',
                  pointerEvents: 'auto',
                  ...cfg.extraStyle,
                }}
                onMouseDown={(e) => handleLayerDown(e, layer.id, 'text', layer.x, layer.y)}
              >
                {layer.text}
              </div>
            );
          })}

          {/* Emoji overlays */}
          {emojiLayers.map((layer) => (
            <div
              key={layer.id}
              className="absolute select-none"
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: layer.size,
                lineHeight: 1,
                zIndex: 10,
                cursor: 'grab',
                userSelect: 'none',
                pointerEvents: 'auto',
              }}
              onMouseDown={(e) => handleLayerDown(e, layer.id, 'emoji', layer.x, layer.y)}
            >
              {layer.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tool panel ── */}
      <div
        className="flex-shrink-0"
        style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map(({ tab, label, Icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors"
              style={{ color: activeTab === tab ? 'var(--accent-violet)' : 'var(--text-muted)' }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4" style={{ minHeight: 152 }}>

          {/* ── Filters ── */}
          {activeTab === 'filter' && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => { setFilter(f.value); setFilterLabel(f.label); }}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-[60px] h-[60px] rounded-xl overflow-hidden"
                    style={{
                      outline: filter === f.value ? '2.5px solid var(--accent-violet)' : '2.5px solid transparent',
                      outlineOffset: 1,
                    }}
                  >
                    {/* Always use the gradient swatch — never depends on media loading */}
                    <div
                      className="w-full h-full"
                      style={{
                        background: FILTER_SWATCH,
                        filter: f.value !== 'none' ? f.value : undefined,
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: filter === f.value ? 'var(--accent-violet)' : 'var(--text-muted)' }}
                  >
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Text ── */}
          {activeTab === 'text' && (
            <div className="flex flex-col gap-3">

              {/* Font picker — visual Aa samples */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {FONT_ORDER.map((key) => {
                  const cfg = EDITOR_FONTS[key];
                  const isNeon = key === 'neon';
                  const isSelected = selectedFont === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedFont(key)}
                      className="flex-shrink-0 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all"
                        style={{
                          fontFamily: cfg.family,
                          fontWeight: cfg.weight,
                          background: isSelected ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.05)',
                          border: `2px solid ${isSelected ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`,
                          color: '#fff',
                          textShadow: isNeon ? '0 0 10px #A78BFA, 0 0 20px #A78BFA' : undefined,
                          ...(key === 'strong' ? { WebkitTextStroke: '0.5px rgba(0,0,0,0.4)' } : {}),
                          ...cfg.extraStyle,
                        }}
                      >
                        Aa
                      </div>
                      <span
                        className="text-[9px] font-medium"
                        style={{ color: isSelected ? 'var(--accent-violet)' : 'var(--text-muted)' }}
                      >
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Stroke + color + size row */}
              <div className="flex items-end gap-4">
                {/* Stroke swatches */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stroke</span>
                  <div className="flex gap-1.5">
                    {STROKE_ORDER.map((sk) => {
                      const isSelected = selectedStroke === sk;
                      return (
                        <button
                          key={sk}
                          onClick={() => setSelectedStroke(sk)}
                          title={EDITOR_STROKES[sk].label}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold transition-all"
                          style={{
                            background: isSelected ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.05)',
                            border: `2px solid ${isSelected ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`,
                            color: '#fff',
                            fontFamily: EDITOR_FONTS[selectedFont].family,
                            fontWeight: EDITOR_FONTS[selectedFont].weight,
                            textShadow: EDITOR_STROKES[sk].preview,
                          }}
                        >
                          T
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color swatches */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Color</span>
                  <div className="flex gap-1.5 flex-wrap" style={{ maxWidth: 136 }}>
                    {EDITOR_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className="w-5 h-5 rounded-full transition-transform"
                        style={{
                          background: c,
                          border: selectedColor === c ? '2px solid #fff' : '2px solid rgba(255,255,255,0.15)',
                          transform: selectedColor === c ? 'scale(1.3)' : 'scale(1)',
                          outline: c === '#FFFFFF' && selectedColor === c ? '1px solid rgba(255,255,255,0.3)' : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Size slider */}
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Size <span className="text-zinc-400">{fontSize}px</span>
                  </span>
                  <input
                    type="range"
                    min={12}
                    max={60}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-violet-500"
                    style={{ height: 4 }}
                  />
                </div>
              </div>

              {/* Text input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddText(); }}
                  placeholder="Type something…"
                  className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontFamily: EDITOR_FONTS[selectedFont].family,
                    color: selectedColor,
                    textShadow: getTextShadow(selectedFont, selectedStroke, selectedColor),
                  }}
                />
                <button
                  onClick={handleAddText}
                  disabled={!newText.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
                  style={{ background: 'var(--accent-violet)', color: '#fff' }}
                >
                  Add
                </button>
              </div>

              {/* Layer pills */}
              {textLayers.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {textLayers.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: l.color,
                        fontFamily: EDITOR_FONTS[l.fontKey].family,
                        textShadow: getTextShadow(l.fontKey, l.stroke, l.color),
                      }}
                    >
                      {l.text}
                      <button
                        onClick={() => setTextLayers((prev) => prev.filter((x) => x.id !== l.id))}
                        className="text-zinc-700 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Emoji ── */}
          {activeTab === 'emoji' && (
            <div className="space-y-2">
              <div className="grid grid-cols-10 gap-1.5">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddEmoji(emoji)}
                    className="text-2xl leading-none hover:scale-125 active:scale-110 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {emojiLayers.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {emojiLayers.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <span className="text-base">{l.emoji}</span>
                      <button
                        onClick={() => setEmojiLayers((prev) => prev.filter((x) => x.id !== l.id))}
                        className="text-zinc-700 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Crop ── */}
          {activeTab === 'crop' && (
            <div className="flex items-center justify-center gap-8 pt-2">
              {CROP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCropRatio(opt.value)}
                  className="flex flex-col items-center gap-2.5 transition-all"
                >
                  <div
                    className="rounded-lg transition-all"
                    style={{
                      width: opt.w,
                      height: opt.h,
                      border: `2.5px solid ${cropRatio === opt.value ? 'var(--accent-violet)' : 'rgba(255,255,255,0.2)'}`,
                      background: cropRatio === opt.value ? 'rgba(124,58,237,0.15)' : 'transparent',
                      opacity: cropRatio === opt.value ? 1 : 0.5,
                    }}
                  />
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: cropRatio === opt.value ? 'var(--accent-violet)' : 'var(--text-muted)' }}
                  >
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
