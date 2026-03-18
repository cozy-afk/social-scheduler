'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Sun, Crop, Type, Smile, Wand2, Trash2,
  Minus, Plus, Sparkles, RotateCcw,
} from 'lucide-react';
import { INSTAGRAM_FILTERS } from '@/lib/instagram-filters';
import type { CropRatio } from '@/types/models';
import type { EditorTool, LocalCropRatio } from '@/types/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  namedFilter: string;   // filter name from INSTAGRAM_FILTERS, '' = Normal
  brightness: number;   // 50–150 (100 = normal)
  contrast: number;     // 50–150
  saturation: number;   // 0–200
  warmth: number;       // -50 to 50 (sepia-ish warm shift)
  vignette: number;     // 0–100
  fade: number;         // 0–100, adds white overlay (desaturation+lift effect)
  sharpen: number;      // 0–100, maps to extra contrast
}

export interface OverlayItem {
  id: string;
  type: 'text' | 'emoji';
  content: string;
  x: number;  // 0–100 %
  y: number;  // 0–100 %
  fontSize: number;
  color: string;
  bold: boolean;
  shadow: boolean;
  align: 'left' | 'center' | 'right';
  fontFamily: string;
}

export interface EditableImage {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
}

export interface ImageEditorResult {
  url: string;
  filters: FilterState;
  overlays: OverlayItem[];
}

// ─── Constants ────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  namedFilter: '',
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  vignette: 0,
  fade: 0,
  sharpen: 0,
};

const CROP_RATIOS: { label: string; value: LocalCropRatio; ratio?: number }[] = [
  { label: 'Free', value: 'free' },
  { label: '1:1', value: '1:1', ratio: 1 },
  { label: '4:5', value: '4:5', ratio: 0.8 },
  { label: '9:16', value: '9:16', ratio: 0.5625 },
  { label: '16:9', value: '16:9', ratio: 1.7778 },
];

const TEXT_COLORS = [
  '#ffffff', '#000000', '#ff3b30', '#ff9500', '#ffcc00',
  '#34c759', '#00c7be', '#007aff', '#5856d6', '#ff2d55',
  '#ff6b35', '#f7c59f', '#efefd0', '#a8d8a8',
];

const FONT_OPTIONS = [
  { label: 'Helvetica', value: 'Helvetica Neue, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier', value: 'Courier New, monospace' },
  { label: 'Impact', value: 'Impact, fantasy' },
];

const EMOJIS: Record<string, string[]> = {
  '🔥 Hot': ['🔥','✨','💎','👑','💅','🤑','💋','😍','🥰','💯','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💗','💓','💞','💕'],
  '😂 Faces': ['😂','😭','🥹','😮‍💨','🤭','🥴','😩','🤩','🥳','😏','😌','😤','🙄','😈','👀','🫶','🙌','🤌','👏','💪','🫁','✌️'],
  '🌸 Aesthetic': ['🌸','🌺','🌹','🌻','🌙','⭐','🌟','💫','✨','🎀','🎆','🎇','🎊','🎉','🍓','🍑','🍒','🫐','🍰','🧁','🍭','🌈'],
  '💆 Vibe': ['💆','🧘','🏋️','🤸','🏃','🚀','🛸','🎭','🎪','🎠','🎡','🎢','🎯','🏆','🥇','🎖️','🏅','🎗️','🎟️','🎫','🎰','🎲'],
  '💼 Promo': ['📸','📱','💻','🖥️','🎬','🎥','📽️','🎞️','📺','📻','🎙️','🎚️','🎛️','💡','🔆','📢','📣','🔊','🗣️','💬','💭','🔔'],
};

// ─── Filter CSS string ────────────────────────────────────────────────

function filtersToCSS(f: FilterState): string {
  const named = INSTAGRAM_FILTERS.find((x) => x.name === f.namedFilter)?.css || '';
  const sharpenExtra = f.sharpen > 0 ? ` contrast(${1 + f.sharpen * 0.005})` : '';
  const manual = [
    `brightness(${f.brightness / 100})`,
    `contrast(${f.contrast / 100})`,
    `saturate(${f.saturation / 100})`,
    f.warmth !== 0 ? `hue-rotate(${f.warmth * 0.5}deg)` : '',
    sharpenExtra,
  ].filter(Boolean).join(' ');
  return [named, manual].filter(Boolean).join(' ');
}

// ─── Slider row component ─────────────────────────────────────────────

function SliderRow({ label, value, min, max, step = 1, onChange, unit = '' }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70">{label}</span>
        <span className="text-white font-mono w-10 text-right">{value > 0 && unit === '+' ? '+' : ''}{value}{unit !== '+' ? unit : ''}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 appearance-none bg-white/20 rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${(value - min) / (max - min) * 100}%, #ffffff20 ${(value - min) / (max - min) * 100}%, #ffffff20 100%)`,
        }}
      />
    </div>
  );
}

// ─── Main ImageEditor ─────────────────────────────────────────────────────────

interface ImageEditorProps {
  item: EditableImage;
  initialFilters?: FilterState;
  initialOverlays?: OverlayItem[];
  onDone: (result: ImageEditorResult) => void;
  onCancel: () => void;
  lockedRatio?: CropRatio;
}

export default function ImageEditor({ item, initialFilters, initialOverlays, onDone, onCancel, lockedRatio }: ImageEditorProps) {
  const [tool, setTool] = useState<EditorTool | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters || DEFAULT_FILTERS);
  const [namedFilter, setNamedFilter] = useState(initialFilters?.namedFilter || '');
  const [cropRatio, setCropRatio] = useState<LocalCropRatio>('free');
  const [overlays, setOverlays] = useState<OverlayItem[]>(initialOverlays || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emojiCategory, setEmojiCategory] = useState<string>('🔥 Hot');
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(28);
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [textBold, setTextBold] = useState(true);
  const [textShadow, setTextShadow] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ clientX: 0, clientY: 0, ox: 0, oy: 0 });
  const [applying, setApplying] = useState(false);
  const [adjustTab, setAdjustTab] = useState<'filter' | 'adjust'>('filter');

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ─ Drag handlers ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isDragging || !selectedId) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((clientX - dragStart.clientX) / rect.width) * 100;
      const dy = ((clientY - dragStart.clientY) / rect.height) * 100;
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === selectedId
            ? { ...o, x: Math.max(2, Math.min(98, dragStart.ox + dx)), y: Math.max(2, Math.min(98, dragStart.oy + dy)) }
            : o
        )
      );
    };

    const handleUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: true });
    document.addEventListener('touchend', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, selectedId, dragStart]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent, overlay: OverlayItem) => {
    e.stopPropagation();
    setSelectedId(overlay.id);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ clientX, clientY, ox: overlay.x, oy: overlay.y });
    setIsDragging(true);
  };

  // ─ Add overlay ────────────────────────────────────────────────────────────

  const addText = () => {
    if (!textInput.trim()) return;
    const id = `ov-${Date.now()}`;
    setOverlays((prev) => [...prev, {
      id, type: 'text', content: textInput.trim(),
      x: 50, y: 50,
      fontSize, color: textColor, bold: textBold, shadow: textShadow,
      align: 'center', fontFamily,
    }]);
    setSelectedId(id);
    setTextInput('');
  };

  const addEmoji = (emoji: string) => {
    const id = `ov-${Date.now()}`;
    setOverlays((prev) => [...prev, {
      id, type: 'emoji', content: emoji,
      x: 50, y: 40,
      fontSize: 40, color: '#ffffff', bold: false, shadow: false, align: 'center', fontFamily: 'Apple Color Emoji, sans-serif',
    }]);
    setSelectedId(id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setOverlays((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  };

  const autoEnhance = () => {
    setFilters({ ...filters, brightness: 108, contrast: 110, saturation: 115, warmth: 8, vignette: 20 });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setNamedFilter('');
  };

  // ─ Apply to canvas & done ────────────────────────────────────────────────

  const handleDone = useCallback(async () => {
    if (item.type === 'video') {
      onDone({ url: item.url, filters: { ...filters, namedFilter }, overlays });
      return;
    }
    setApplying(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = item.url;
      });

      // Determine crop
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      const ratioObj = CROP_RATIOS.find((r) => r.value === cropRatio);
      if (ratioObj?.ratio) {
        const imgRatio = sw / sh;
        if (imgRatio > ratioObj.ratio) {
          sw = sh * ratioObj.ratio;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = sw / ratioObj.ratio;
          sy = (img.naturalHeight - sh) / 2;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d')!;

      // Apply image + CSS filters (named + manual adjustments)
      const fullFilter = filtersToCSS({ ...filters, namedFilter });
      ctx.filter = fullFilter || 'none';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      // Fade overlay (white semi-transparent layer)
      if (filters.fade > 0) {
        ctx.filter = 'none';
        ctx.fillStyle = `rgba(255,255,255,${filters.fade / 200})`;
        ctx.fillRect(0, 0, sw, sh);
      }

      // Vignette
      if (filters.vignette > 0) {
        ctx.filter = 'none';
        const gradient = ctx.createRadialGradient(sw / 2, sh / 2, 0, sw / 2, sh / 2, Math.max(sw, sh) * 0.7);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${filters.vignette / 150})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, sw, sh);
      }

      // Draw overlays
      ctx.filter = 'none';
      overlays.forEach((ov) => {
        const x = (ov.x / 100) * sw;
        const y = (ov.y / 100) * sh;
        const scale = sw / 400; // scale relative to 400px display width
        const fs = ov.fontSize * scale;

        ctx.font = `${ov.bold ? 'bold ' : ''}${fs}px ${ov.fontFamily || 'Arial'}`;
        ctx.textAlign = ov.align;
        ctx.fillStyle = ov.color;

        if (ov.shadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 8 * scale;
          ctx.shadowOffsetX = 1 * scale;
          ctx.shadowOffsetY = 1 * scale;
        }
        ctx.fillText(ov.content, x, y);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onDone({ url: dataUrl, filters: { ...filters, namedFilter }, overlays });
    } catch {
      // fallback: return original with metadata
      onDone({ url: item.url, filters: { ...filters, namedFilter }, overlays });
    } finally {
      setApplying(false);
    }
  }, [item, filters, namedFilter, overlays, cropRatio, onDone]);

  // ─ Crop overlay helper ───────────────────────────────────────────────────

  const getCropStyle = (): React.CSSProperties => {
    const ratioObj = CROP_RATIOS.find((r) => r.value === cropRatio);
    if (!ratioObj?.ratio) return {};
    return { aspectRatio: `${ratioObj.value.replace(':', '/')}` };
  };

  const selectedOverlay = overlays.find((o) => o.id === selectedId);

  // The live CSS filter string applied to the preview image
  const previewFilterCSS = filtersToCSS({ ...filters, namedFilter });

  // Toggle tool panel: tap active tab to close
  const handleToolClick = (id: EditorTool) => {
    setTool((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.97)', touchAction: isDragging ? 'none' : 'auto' }}
    >
      {/* Phone-sized frame */}
      <div
        className="relative w-full sm:max-w-[390px] bg-black flex flex-col overflow-hidden sm:rounded-3xl"
        style={{ height: '100dvh', maxHeight: '100dvh' }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-black">
          <button
            onClick={onCancel}
            className="text-white/70 hover:text-white transition-colors p-1 -ml-1"
          >
            <X className="w-6 h-6" />
          </button>
          <span className="text-sm font-semibold text-white tracking-wide">Edit</span>
          <button
            onClick={handleDone}
            disabled={applying}
            className="bg-white text-black text-sm font-bold px-5 py-1.5 rounded-full transition-all hover:bg-white/90 disabled:opacity-50"
          >
            {applying ? 'Saving…' : 'Done'}
          </button>
        </div>

        {/* Canvas — fills all remaining space */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-black select-none"
          onClick={() => setSelectedId(null)}
        >
          {item.type === 'image' ? (
            <img
              ref={imgRef}
              src={item.url}
              alt=""
              className="w-full h-full object-contain"
              style={{ filter: previewFilterCSS || 'none', userSelect: 'none', pointerEvents: 'none' }}
              draggable={false}
            />
          ) : (
            <video
              src={item.url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-contain"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Fade overlay */}
          {filters.fade > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: `rgba(255,255,255,${filters.fade / 200})` }}
            />
          )}

          {/* Vignette overlay */}
          {filters.vignette > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${filters.vignette / 150}) 100%)`,
              }}
            />
          )}

          {/* Crop overlay */}
          {tool === 'crop' && cropRatio !== 'free' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-black/50" />
              <div
                className="absolute inset-0 m-auto border-2 border-white/70"
                style={{
                  ...getCropStyle(),
                  maxWidth: '100%', maxHeight: '100%',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                }}
              >
                <div className="absolute inset-0">
                  {[33, 66].map((p) => (
                    <div key={`h${p}`} className="absolute left-0 right-0 border-t border-white/20" style={{ top: `${p}%` }} />
                  ))}
                  {[33, 66].map((p) => (
                    <div key={`v${p}`} className="absolute top-0 bottom-0 border-l border-white/20" style={{ left: `${p}%` }} />
                  ))}
                </div>
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos) => (
                  <div key={pos} className={`absolute w-4 h-4 border-2 border-white ${pos}`} />
                ))}
              </div>
            </div>
          )}

          {/* Overlay items (text/emoji) */}
          {overlays.map((ov) => (
            <div
              key={ov.id}
              onMouseDown={(e) => startDrag(e, ov)}
              onTouchStart={(e) => startDrag(e, ov)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(ov.id); }}
              className={`absolute cursor-move select-none ${selectedId === ov.id ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-transparent' : ''}`}
              style={{
                left: `${ov.x}%`,
                top: `${ov.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${ov.fontSize}px`,
                fontFamily: ov.fontFamily,
                fontWeight: ov.bold ? 'bold' : 'normal',
                color: ov.color,
                textShadow: ov.shadow ? '1px 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)' : 'none',
                textAlign: ov.align,
                whiteSpace: 'nowrap',
                zIndex: 10,
                lineHeight: 1.2,
              }}
            >
              {ov.content}
            </div>
          ))}

          {/* Selected overlay controls — floats near bottom of canvas */}
          {selectedOverlay && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3 z-20">
              <span className="text-xs text-white/60">{selectedOverlay.type === 'text' ? 'Text' : 'Emoji'}</span>
              <div className="h-4 w-px bg-white/20" />
              <button onClick={removeSelected} className="flex items-center gap-1.5 text-xs text-white hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
              {selectedOverlay.type === 'text' && (
                <>
                  <div className="h-4 w-px bg-white/20" />
                  <input
                    type="color"
                    value={selectedOverlay.color}
                    onChange={(e) => setOverlays((prev) => prev.map((o) => o.id === selectedId ? { ...o, color: e.target.value } : o))}
                    className="w-6 h-6 rounded-full cursor-pointer border-2 border-white/20 bg-transparent p-0"
                  />
                  <button
                    onClick={() => setOverlays((prev) => prev.map((o) => o.id === selectedId ? { ...o, fontSize: Math.max(12, o.fontSize - 4) } : o))}
                    className="text-white/70 hover:text-white p-0.5"
                  ><Minus className="w-3.5 h-3.5" /></button>
                  <span className="text-xs text-white font-mono w-5 text-center">{selectedOverlay.fontSize}</span>
                  <button
                    onClick={() => setOverlays((prev) => prev.map((o) => o.id === selectedId ? { ...o, fontSize: Math.min(72, o.fontSize + 4) } : o))}
                    className="text-white/70 hover:text-white p-0.5"
                  ><Plus className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tool panel — absolute, slides up over canvas, does NOT push image up */}
        {tool !== null && (
          <div
            className="absolute left-0 right-0 z-30 overflow-y-auto"
            style={{
              bottom: 64,
              maxHeight: '44%',
              background: 'rgba(0,0,0,0.96)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Filters panel */}
            {tool === 'filters' && (
              <div className="px-4 py-4">
                <div className="flex items-center gap-1 mb-4">
                  <button
                    onClick={() => setAdjustTab('filter')}
                    className={`flex-1 py-2 text-sm font-semibold transition-all relative ${adjustTab === 'filter' ? 'text-white' : 'text-white/40'}`}
                  >
                    FILTER
                    {adjustTab === 'filter' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />}
                  </button>
                  <button
                    onClick={() => setAdjustTab('adjust')}
                    className={`flex-1 py-2 text-sm font-semibold transition-all relative ${adjustTab === 'adjust' ? 'text-white' : 'text-white/40'}`}
                  >
                    ADJUST
                    {adjustTab === 'adjust' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />}
                  </button>
                </div>

                {adjustTab === 'filter' && (
                  <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4">
                    <button
                      onClick={() => setNamedFilter('')}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0"
                    >
                      <div className={`w-14 h-14 rounded-xl overflow-hidden transition-all ${namedFilter === '' ? 'ring-2 ring-white' : 'ring-1 ring-white/20'}`}>
                        <img src={item.url} alt="Original" className="w-full h-full object-cover" />
                      </div>
                      <span className={`text-[10px] font-medium ${namedFilter === '' ? 'text-white' : 'text-white/40'}`}>ORIGINAL</span>
                    </button>
                    {INSTAGRAM_FILTERS.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => setNamedFilter(f.name)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0"
                      >
                        <div className={`w-14 h-14 rounded-xl overflow-hidden transition-all ${namedFilter === f.name ? 'ring-2 ring-white' : 'ring-1 ring-white/20'}`}>
                          <img src={item.url} alt={f.name} className="w-full h-full object-cover" style={{ filter: f.css || 'none' }} />
                        </div>
                        <span className={`text-[10px] font-medium ${namedFilter === f.name ? 'text-white' : 'text-white/40'}`}>{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {adjustTab === 'adjust' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={autoEnhance} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/20 border border-violet-500/30 px-3 py-1.5 rounded-full transition-colors">
                        <Wand2 className="w-3 h-3" /> Auto
                      </button>
                      <button onClick={resetFilters} className="text-white/50 hover:text-white p-1.5 transition-colors">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <SliderRow label="Brightness" value={filters.brightness} min={50} max={150} onChange={(v) => setFilters((f) => ({ ...f, brightness: v }))} />
                    <SliderRow label="Contrast" value={filters.contrast} min={50} max={150} onChange={(v) => setFilters((f) => ({ ...f, contrast: v }))} />
                    <SliderRow label="Saturation" value={filters.saturation} min={0} max={200} onChange={(v) => setFilters((f) => ({ ...f, saturation: v }))} />
                    <SliderRow label="Warmth" value={filters.warmth} min={-50} max={50} onChange={(v) => setFilters((f) => ({ ...f, warmth: v }))} unit="+" />
                    <SliderRow label="Vignette" value={filters.vignette} min={0} max={100} onChange={(v) => setFilters((f) => ({ ...f, vignette: v }))} unit="%" />
                    <SliderRow label="Fade" value={filters.fade} min={0} max={100} onChange={(v) => setFilters((f) => ({ ...f, fade: v }))} />
                    <SliderRow label="Sharpen" value={filters.sharpen} min={0} max={100} onChange={(v) => setFilters((f) => ({ ...f, sharpen: v }))} />
                  </div>
                )}
              </div>
            )}

            {/* Adjust panel */}
            {tool === 'adjust' && (
              <div className="px-4 py-4 space-y-4">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={autoEnhance} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/20 border border-violet-500/30 px-3 py-1.5 rounded-full transition-colors">
                    <Wand2 className="w-3 h-3" /> Auto Enhance
                  </button>
                  <button onClick={resetFilters} className="text-white/50 hover:text-white p-1.5 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <SliderRow label="Brightness" value={filters.brightness} min={50} max={150} onChange={(v) => setFilters((f) => ({ ...f, brightness: v }))} />
                <SliderRow label="Contrast" value={filters.contrast} min={50} max={150} onChange={(v) => setFilters((f) => ({ ...f, contrast: v }))} />
                <SliderRow label="Saturation" value={filters.saturation} min={0} max={200} onChange={(v) => setFilters((f) => ({ ...f, saturation: v }))} />
                <SliderRow label="Warmth" value={filters.warmth} min={-50} max={50} onChange={(v) => setFilters((f) => ({ ...f, warmth: v }))} unit="+" />
                <SliderRow label="Vignette" value={filters.vignette} min={0} max={100} onChange={(v) => setFilters((f) => ({ ...f, vignette: v }))} unit="%" />
                <SliderRow label="Fade" value={filters.fade} min={0} max={100} onChange={(v) => setFilters((f) => ({ ...f, fade: v }))} />
                <SliderRow label="Sharpen" value={filters.sharpen} min={0} max={100} onChange={(v) => setFilters((f) => ({ ...f, sharpen: v }))} />
              </div>
            )}

            {/* Crop panel */}
            {tool === 'crop' && (
              <div className="px-4 py-4">
                <p className="text-xs text-white/50 mb-3">Aspect ratio</p>
                <div className="flex flex-wrap gap-2">
                  {CROP_RATIOS.map((r) => {
                    const isLocked = lockedRatio !== undefined && r.value !== lockedRatio && r.value !== 'free';
                    return (
                      <button
                        key={r.value}
                        onClick={() => !isLocked && setCropRatio(r.value)}
                        className={`flex-1 min-w-16 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          cropRatio === r.value
                            ? 'bg-white text-black border-white'
                            : 'bg-white/10 border-white/20 text-white/70 hover:border-white/40'
                        } ${isLocked ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                {lockedRatio && (
                  <p className="text-[10px] text-white/40 mt-3">Ratio locked from staging</p>
                )}
              </div>
            )}

            {/* Text panel */}
            {tool === 'text' && (
              <div className="px-4 py-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addText()}
                    placeholder="Type your text…"
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                  />
                  <button
                    onClick={addText}
                    disabled={!textInput.trim()}
                    className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-white/40 mr-1">Color</span>
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all ${textColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 bg-white/10 rounded-lg px-1.5">
                    <button onClick={() => setFontSize((s) => Math.max(12, s - 4))} className="text-white/70 hover:text-white p-1"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs text-white font-mono w-6 text-center">{fontSize}</span>
                    <button onClick={() => setFontSize((s) => Math.min(72, s + 4))} className="text-white/70 hover:text-white p-1"><Plus className="w-3 h-3" /></button>
                  </div>
                  <button
                    onClick={() => setTextBold((b) => !b)}
                    className={`text-sm px-3 py-1.5 rounded-lg border font-bold transition-all ${textBold ? 'bg-white text-black border-white' : 'bg-white/10 border-white/20 text-white/60'}`}
                  >B</button>
                  <button
                    onClick={() => setTextShadow((s) => !s)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${textShadow ? 'bg-white/20 border-white/40 text-white' : 'bg-white/10 border-white/20 text-white/40'}`}
                  >Shadow</button>
                </div>
              </div>
            )}

            {/* Emoji panel */}
            {tool === 'emoji' && (
              <div className="px-4 py-4">
                <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 mb-3">
                  {Object.keys(EMOJIS).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setEmojiCategory(cat)}
                      className={`flex-shrink-0 text-xs px-3 py-1 rounded-full border transition-all ${
                        emojiCategory === cat
                          ? 'bg-white text-black border-white'
                          : 'bg-white/10 border-white/20 text-white/50 hover:border-white/40'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-11 gap-1">
                  {(EMOJIS[emojiCategory] || []).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="text-xl p-1 hover:scale-125 transition-transform rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom toolbar — always visible, never moves */}
        <div className="flex-shrink-0 h-16 bg-black border-t border-white/10 flex items-center justify-around z-40">
          {([
            { id: 'filters' as EditorTool, icon: <Sparkles className="w-5 h-5" />, label: 'Filters' },
            { id: 'crop' as EditorTool,    icon: <Crop className="w-5 h-5" />,     label: 'Crop' },
            { id: 'adjust' as EditorTool,  icon: <Sun className="w-5 h-5" />,      label: 'Adjust' },
            { id: 'text' as EditorTool,    icon: <Type className="w-5 h-5" />,     label: 'Text' },
            { id: 'emoji' as EditorTool,   icon: <Smile className="w-5 h-5" />,    label: 'Emoji' },
          ]).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => handleToolClick(id)}
              className={`flex flex-col items-center gap-1 px-4 py-1 relative transition-all ${
                tool === id ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {icon}
              <span className="text-[10px] font-medium">{label}</span>
              {tool === id && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
