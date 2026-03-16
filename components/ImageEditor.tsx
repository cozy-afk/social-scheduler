'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Check, Sun, Crop, Type, Smile, Wand2, Trash2,
  Bold, AlignCenter, ChevronLeft, ChevronRight, RotateCcw,
  Minus, Plus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  brightness: number;   // 50–150 (100 = normal)
  contrast: number;     // 50–150
  saturation: number;   // 0–200
  warmth: number;       // -50 to 50 (sepia-ish warm shift)
  vignette: number;     // 0–100
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

type EditorTool = 'crop' | 'enhance' | 'text' | 'emoji';
type CropRatio = 'free' | '1:1' | '4:5' | '9:16' | '16:9';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = { brightness: 100, contrast: 100, saturation: 100, warmth: 0, vignette: 0 };

const CROP_RATIOS: { label: string; value: CropRatio; ratio?: number }[] = [
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

// ─── Filter CSS string ────────────────────────────────────────────────────────

function filtersToCSS(f: FilterState): string {
  const warm = f.warmth > 0 ? `sepia(${f.warmth * 0.5}%)` : f.warmth < 0 ? `hue-rotate(${f.warmth * 1.5}deg)` : '';
  return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) ${warm}`.trim();
}

// ─── Slider row component ─────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step = 1, onChange, unit = '' }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono w-10 text-right">{value > 0 && unit === '+' ? '+' : ''}{value}{unit !== '+' ? unit : ''}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 h-1.5"
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
}

export default function ImageEditor({ item, initialFilters, initialOverlays, onDone, onCancel }: ImageEditorProps) {
  const [tool, setTool] = useState<EditorTool>('enhance');
  const [filters, setFilters] = useState<FilterState>(initialFilters || DEFAULT_FILTERS);
  const [cropRatio, setCropRatio] = useState<CropRatio>('free');
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
    setFilters({ brightness: 108, contrast: 110, saturation: 115, warmth: 8, vignette: 20 });
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  // ─ Apply to canvas & done ────────────────────────────────────────────────

  const handleDone = useCallback(async () => {
    if (item.type === 'video') {
      onDone({ url: item.url, filters, overlays });
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

      // Apply image + CSS filters
      ctx.filter = filtersToCSS(filters);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

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
      onDone({ url: dataUrl, filters, overlays });
    } catch {
      // fallback: return original with metadata
      onDone({ url: item.url, filters, overlays });
    } finally {
      setApplying(false);
    }
  }, [item, filters, overlays, cropRatio, onDone]);

  // ─ Crop overlay helper ───────────────────────────────────────────────────

  const getCropStyle = (): React.CSSProperties => {
    const ratioObj = CROP_RATIOS.find((r) => r.value === cropRatio);
    if (!ratioObj?.ratio) return {};
    const containerAspect = 1; // image container is square-ish; use the image's actual display ratio
    return { aspectRatio: `${ratioObj.value.replace(':', '/')}` };
  };

  const selectedOverlay = overlays.find((o) => o.id === selectedId);

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col" style={{ touchAction: isDragging ? 'none' : 'auto' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onCancel} className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm transition-colors">
          <ChevronLeft className="w-5 h-5" />
          Cancel
        </button>
        <h2 className="text-white font-semibold text-sm">Edit Image</h2>
        <button
          onClick={handleDone}
          disabled={applying}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          {applying ? 'Applying…' : 'Done'}
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        <div
          ref={containerRef}
          className="relative select-none"
          style={{ maxWidth: '420px', maxHeight: '420px', width: '100%', aspectRatio: '1/1' }}
          onClick={() => setSelectedId(null)}
        >
          {item.type === 'image' ? (
            <img
              ref={imgRef}
              src={item.url}
              alt=""
              className="w-full h-full object-cover rounded-2xl"
              style={{ filter: filtersToCSS(filters), userSelect: 'none', pointerEvents: 'none' }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
              <p className="text-slate-400 text-sm">Video preview not available</p>
            </div>
          )}

          {/* Vignette overlay */}
          {filters.vignette > 0 && (
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${filters.vignette / 150}) 100%)`,
              }}
            />
          )}

          {/* Crop overlay */}
          {tool === 'crop' && cropRatio !== 'free' && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-black/50" />
              <div
                className="absolute inset-0 m-auto border-2 border-white"
                style={{
                  ...getCropStyle(),
                  maxWidth: '100%', maxHeight: '100%',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                }}
              >
                {/* Rule-of-thirds grid */}
                <div className="absolute inset-0">
                  {[33, 66].map((p) => (
                    <div key={`h${p}`} className="absolute left-0 right-0 border-t border-white/20" style={{ top: `${p}%` }} />
                  ))}
                  {[33, 66].map((p) => (
                    <div key={`v${p}`} className="absolute top-0 bottom-0 border-l border-white/20" style={{ left: `${p}%` }} />
                  ))}
                </div>
                {/* Corner handles */}
                {[
                  'top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0',
                ].map((pos) => (
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
              className={`absolute cursor-move select-none transition-all ${selectedId === ov.id ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-transparent' : ''}`}
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
        </div>
      </div>

      {/* Selected overlay controls */}
      {selectedOverlay && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-slate-800 flex-shrink-0">
          <span className="text-xs text-slate-400">{selectedOverlay.type === 'text' ? 'Text' : 'Emoji'}</span>
          <button onClick={removeSelected} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/15 border border-red-500/30 px-3 py-1.5 rounded-full transition-colors">
            <Trash2 className="w-3 h-3" /> Remove
          </button>
          {selectedOverlay.type === 'text' && (
            <>
              <input
                type="color"
                value={selectedOverlay.color}
                onChange={(e) => setOverlays((prev) => prev.map((o) => o.id === selectedId ? { ...o, color: e.target.value } : o))}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <button
                onClick={() => setOverlays((prev) => prev.map((o) => o.id === selectedId ? { ...o, fontSize: Math.max(12, o.fontSize - 4) } : o))}
                className="btn-ghost p-1.5"
              ><Minus className="w-3.5 h-3.5" /></button>
              <span className="text-xs text-white font-mono w-6 text-center">{selectedOverlay.fontSize}</span>
              <button
                onClick={() => setOverlays((prev) => prev.map((o) => o.id === selectedId ? { ...o, fontSize: Math.min(72, o.fontSize + 4) } : o))}
                className="btn-ghost p-1.5"
              ><Plus className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
      )}

      {/* Tool panel */}
      <div className="bg-slate-950 border-t border-slate-800 flex-shrink-0 max-h-[40vh] overflow-y-auto">
        {/* Enhance */}
        {tool === 'enhance' && (
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Adjustments</span>
              <div className="flex gap-2">
                <button onClick={autoEnhance} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/15 border border-violet-500/30 px-3 py-1.5 rounded-full transition-colors">
                  <Wand2 className="w-3 h-3" /> Auto Enhance
                </button>
                <button onClick={resetFilters} className="text-xs text-slate-400 hover:text-white px-2 py-1.5 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <SliderRow label="Brightness" value={filters.brightness} min={50} max={150} onChange={(v) => setFilters((f) => ({ ...f, brightness: v }))} />
            <SliderRow label="Contrast" value={filters.contrast} min={50} max={150} onChange={(v) => setFilters((f) => ({ ...f, contrast: v }))} />
            <SliderRow label="Saturation" value={filters.saturation} min={0} max={200} onChange={(v) => setFilters((f) => ({ ...f, saturation: v }))} />
            <SliderRow label="Warmth" value={filters.warmth} min={-50} max={50} onChange={(v) => setFilters((f) => ({ ...f, warmth: v }))} unit="+" />
            <SliderRow label="Vignette" value={filters.vignette} min={0} max={100} onChange={(v) => setFilters((f) => ({ ...f, vignette: v }))} unit="%" />
          </div>
        )}

        {/* Crop */}
        {tool === 'crop' && (
          <div className="px-5 py-4">
            <p className="text-xs text-slate-400 mb-3">Select aspect ratio. Changes apply when you tap <strong className="text-white">Done</strong>.</p>
            <div className="flex flex-wrap gap-2">
              {CROP_RATIOS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setCropRatio(r.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    cropRatio === r.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {cropRatio !== 'free' && (
              <p className="text-xs text-blue-400 mt-3">
                📐 {cropRatio} crop will be applied to the center of the image.
              </p>
            )}
          </div>
        )}

        {/* Text */}
        {tool === 'text' && (
          <div className="px-5 py-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addText()}
                placeholder="Type your text…"
                className="input-dark flex-1 text-sm py-2"
              />
              <button
                onClick={addText}
                disabled={!textInput.trim()}
                className="btn-primary px-4 text-sm disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {/* Color row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-500">Color</span>
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTextColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all flex-shrink-0 ${textColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Options row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] text-slate-500">Font</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500">Size</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setFontSize((s) => Math.max(12, s - 4))} className="btn-ghost p-1"><Minus className="w-3.5 h-3.5" /></button>
                <span className="text-xs text-white font-mono w-6 text-center">{fontSize}</span>
                <button onClick={() => setFontSize((s) => Math.min(72, s + 4))} className="btn-ghost p-1"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <button
                onClick={() => setTextBold((b) => !b)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-bold ${textBold ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >B</button>
              <button
                onClick={() => setTextShadow((s) => !s)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${textShadow ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >Shadow</button>
            </div>
          </div>
        )}

        {/* Emoji */}
        {tool === 'emoji' && (
          <div className="px-4 py-3 space-y-2">
            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {Object.keys(EMOJIS).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setEmojiCategory(cat)}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                    emojiCategory === cat
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Emoji grid */}
            <div className="grid grid-cols-11 gap-1">
              {(EMOJIS[emojiCategory] || []).map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl p-0.5 hover:scale-125 transition-transform rounded"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-3 flex items-center justify-around flex-shrink-0">
        {([
          { id: 'crop',    icon: <Crop className="w-5 h-5" />,   label: 'Crop' },
          { id: 'enhance', icon: <Sun className="w-5 h-5" />,    label: 'Enhance' },
          { id: 'text',    icon: <Type className="w-5 h-5" />,   label: 'Text' },
          { id: 'emoji',   icon: <Smile className="w-5 h-5" />,  label: 'Emoji' },
        ] as const).map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all ${
              tool === id
                ? 'text-blue-400 bg-blue-600/15'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
