'use client';

/**
 * VariationCreator — renders text captions onto an image or video,
 * saves each variation as a new file to the R2 vault under _variants/.
 *
 * For images:  canvas drawImage + drawText → toBlob → upload
 * For videos:  canvas compositing loop + MediaRecorder → Blob → upload
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, Wand2, Check, AlertCircle } from 'lucide-react';
import { GalleryAsset } from '@/types/models';
import { useStore } from '@/lib/store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverlaySpec {
  text: string;
  vPosition: 'top' | 'center' | 'bottom';
  color: string;
  fontSize: number; // relative to canvas height (0–1), displayed as px in UI
  bold: boolean;
}

interface VariationState {
  id: string;
  spec: OverlaySpec;
  status: 'idle' | 'rendering' | 'uploading' | 'done' | 'error';
  progress: number; // 0–100
  errorMsg?: string;
  resultAsset?: GalleryAsset;
}

interface VariationCreatorProps {
  asset: GalleryAsset;
  modelFolder: string; // e.g. "CELIA"
  onClose: () => void;
  onSaved: (variants: GalleryAsset[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#FFFFFF', '#000000', '#FFCC00', '#FF3B30',
  '#FF9500', '#34C759', '#007AFF', '#FF2D55',
];

const DEFAULT_SPEC: OverlaySpec = {
  text: '',
  vPosition: 'bottom',
  color: '#FFFFFF',
  fontSize: 52,
  bold: true,
};

// ─── Canvas text rendering helper ─────────────────────────────────────────────

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  spec: OverlaySpec,
  w: number,
  h: number
) {
  const { text, vPosition, color, fontSize, bold } = spec;
  if (!text.trim()) return;

  ctx.save();

  // Scale font relative to canvas width for consistent appearance
  const scaledFont = Math.round(fontSize * (w / 390));
  ctx.font = `${bold ? 'bold ' : ''}${scaledFont}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word-wrap the text
  const words = text.split(' ');
  const maxWidth = w * 0.85;
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineH = scaledFont * 1.3;
  const blockH = lines.length * lineH;
  const padding = scaledFont * 0.6;

  // Vertical position
  let blockTop: number;
  if (vPosition === 'top') blockTop = padding;
  else if (vPosition === 'bottom') blockTop = h - blockH - padding;
  else blockTop = (h - blockH) / 2;

  // Semi-transparent background pill per line
  for (let i = 0; i < lines.length; i++) {
    const y = blockTop + i * lineH + lineH / 2;
    const tw = ctx.measureText(lines[i]).width;
    const rx = w / 2 - tw / 2 - padding / 2;
    const ry = y - lineH * 0.5;
    const rw = tw + padding;
    const rh = lineH;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const r = rh * 0.25;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    ctx.fill();

    // Text shadow
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = color;
    ctx.fillText(lines[i], w / 2, y);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ─── Image renderer ───────────────────────────────────────────────────────────

async function renderImageVariation(
  proxySrc: string,
  spec: OverlaySpec,
  outputMime: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<Blob> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = proxySrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  drawTextOverlay(ctx, spec, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      outputMime,
      0.92
    );
  });
}

// ─── Video renderer (Canvas + MediaRecorder) ─────────────────────────────────

function renderVideoVariation(
  proxySrc: string,
  spec: OverlaySpec,
  onProgress: (pct: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = proxySrc;
    video.muted = false; // keep audio
    video.playsInline = true;
    video.crossOrigin = ''; // same-origin proxy → no taint

    video.onloadedmetadata = () => {
      const { videoWidth: w, videoHeight: h, duration } = video;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      // Capture canvas video stream
      const canvasStream = canvas.captureStream(30);

      // Capture audio from video via Web Audio API
      try {
        const audioCtx = new AudioContext();
        const src = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        src.connect(dest);
        src.connect(audioCtx.destination); // keep audio audible during render
        dest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
      } catch {
        // Audio capture not supported — continue without audio track
      }

      // Pick best supported output format
      const mimeTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';

      const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.onerror = () => reject(new Error('MediaRecorder error'));

      // Draw loop
      let rafId: number;
      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        drawTextOverlay(ctx, spec, w, h);
        onProgress(Math.round((video.currentTime / duration) * 100));
        rafId = requestAnimationFrame(drawFrame);
      };

      recorder.start(100); // collect chunks every 100ms
      video.play().then(() => {
        rafId = requestAnimationFrame(drawFrame);
      }).catch(reject);

      video.onended = () => {
        cancelAnimationFrame(rafId);
        recorder.stop();
        onProgress(100);
      };
    };

    video.onerror = () => reject(new Error('Video load failed'));
    video.load();
  });
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadVariant(
  blob: Blob,
  modelFolder: string,
  fileName: string,
  contentType: string,
): Promise<{ key: string }> {
  // Get presigned PUT URL
  const res = await fetch('/api/r2/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelFolder, fileName, contentType, subPath: '_variants' }),
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl, key } = await res.json();

  // PUT blob directly to R2
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!putRes.ok) throw new Error('R2 upload failed');

  return { key };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VariationCreator({ asset, modelFolder, onClose, onSaved }: VariationCreatorProps) {
  const { setGalleryAssets, galleryAssets } = useStore();

  const [variations, setVariations] = useState<VariationState[]>([
    { id: '1', spec: { ...DEFAULT_SPEC }, status: 'idle', progress: 0 },
    { id: '2', spec: { ...DEFAULT_SPEC, text: '' }, status: 'idle', progress: 0 },
  ]);
  const [previewVarId, setPreviewVarId] = useState('1');
  const [running, setRunning] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Proxy URL for same-origin canvas access
  const proxySrc = asset.s3Key
    ? `/api/r2/proxy?key=${encodeURIComponent(asset.s3Key)}`
    : asset.fileUrl;

  // ─ Live canvas preview (images only) ───────────────────────────────────────

  const redrawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = previewImgRef.current;
    if (!canvas || !img || !img.complete || asset.fileType !== 'image') return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const v = variations.find((v) => v.id === previewVarId);
    if (v) drawTextOverlay(ctx, v.spec, canvas.width, canvas.height);
  }, [variations, previewVarId, asset.fileType]);

  useEffect(() => { redrawPreview(); }, [redrawPreview]);

  // ─ Variation mutators ──────────────────────────────────────────────────────

  const updateSpec = (id: string, patch: Partial<OverlaySpec>) => {
    setVariations((prev) =>
      prev.map((v) => v.id === id ? { ...v, spec: { ...v.spec, ...patch } } : v)
    );
  };

  const addVariation = () => {
    if (variations.length >= 5) return;
    const newId = String(Date.now());
    setVariations((prev) => [
      ...prev,
      { id: newId, spec: { ...DEFAULT_SPEC }, status: 'idle', progress: 0 },
    ]);
    setPreviewVarId(newId);
  };

  const removeVariation = (id: string) => {
    setVariations((prev) => {
      const next = prev.filter((v) => v.id !== id);
      if (previewVarId === id && next.length) setPreviewVarId(next[0].id);
      return next;
    });
  };

  // ─ Generate all ────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    const toProcess = variations.filter((v) => v.spec.text.trim());
    if (!toProcess.length) return;
    setRunning(true);

    const savedAssets: GalleryAsset[] = [];

    for (let i = 0; i < toProcess.length; i++) {
      const v = toProcess[i];
      const setStatus = (patch: Partial<VariationState>) =>
        setVariations((prev) => prev.map((x) => x.id === v.id ? { ...x, ...patch } : x));

      setStatus({ status: 'rendering', progress: 0 });

      try {
        // Build a safe slug from the caption text for the filename
        const slug = v.spec.text.trim().toLowerCase()
          .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '_').slice(0, 40);

        // Extract base UUID from original asset id (format: FOLDER-uuid)
        const baseUUID = asset.id.replace(`${modelFolder}-`, '');

        // Filename encodes: baseUUID, variant index, caption slug
        const ext = asset.fileType === 'video' ? 'mp4' : 'jpg';
        const varFileName = `${baseUUID}--v${i + 1}--${slug}.${ext}`;
        const contentType = asset.fileType === 'video' ? 'video/mp4' : 'image/jpeg';

        let blob: Blob;
        if (asset.fileType === 'image') {
          blob = await renderImageVariation(proxySrc, v.spec);
        } else {
          blob = await renderVideoVariation(proxySrc, v.spec, (pct) => setStatus({ progress: pct }));
        }

        setStatus({ status: 'uploading', progress: 100 });

        const { key } = await uploadVariant(blob, modelFolder, varFileName, contentType);

        // Build a presigned URL for immediate display
        const presignRes = await fetch(`/api/r2/gallery?modelFolder=${encodeURIComponent(modelFolder)}&limit=1`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        // We can construct a direct proxy URL for display without a second API call
        const displayUrl = `/api/r2/proxy?key=${encodeURIComponent(key)}`;

        const newAsset: GalleryAsset = {
          id: `${modelFolder}-${Date.now()}-${i}`,
          fileName: varFileName,
          fileUrl: displayUrl,
          thumbnailUrl: asset.fileType === 'image' ? displayUrl : undefined,
          fileType: asset.fileType,
          sizeBytes: blob.size,
          uploadedAt: new Date().toISOString(),
          source: 's3',
          s3Key: key,
          variantOf: asset.id,
          variantLabel: `v${i + 1}`,
          overlayText: v.spec.text.trim(),
        };

        savedAssets.push(newAsset);
        setStatus({ status: 'done', progress: 100, resultAsset: newAsset });
      } catch (err) {
        setStatus({ status: 'error', errorMsg: err instanceof Error ? err.message : 'Failed' });
      }
    }

    // Add to gallery store
    if (savedAssets.length > 0) {
      setGalleryAssets([...galleryAssets, ...savedAssets]);
      onSaved(savedAssets);
    }
    setRunning(false);
  }, [variations, asset, modelFolder, proxySrc, galleryAssets, setGalleryAssets, onSaved]);

  const allDone = variations.every((v) => !v.spec.text.trim() || v.status === 'done');
  const hasText = variations.some((v) => v.spec.text.trim());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col gap-0 rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h2 className="text-base font-bold text-white">Create Variations</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Add different captions to create separate posts — each saved to your vault
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-0 flex-1 min-h-0">
          {/* LEFT: Preview */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center p-5 gap-3"
            style={{ width: 280, background: 'rgba(0,0,0,0.3)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider self-start"
              style={{ color: 'var(--text-muted)' }}>
              Preview · {variations.find(v => v.id === previewVarId)?.spec.text ? 'Caption ON' : 'No caption'}
            </p>

            <div className="relative rounded-xl overflow-hidden w-full"
              style={{ aspectRatio: '9/16', maxHeight: 380, background: '#000' }}>
              {asset.fileType === 'image' ? (
                <>
                  {/* Hidden img for natural dimensions */}
                  <img ref={previewImgRef} src={proxySrc} alt="" className="hidden"
                    onLoad={redrawPreview} crossOrigin="anonymous" />
                  <canvas ref={previewCanvasRef} className="w-full h-full object-contain" />
                </>
              ) : (
                <div className="relative w-full h-full">
                  <video ref={previewVideoRef} src={proxySrc} className="w-full h-full object-cover"
                    muted playsInline preload="metadata"
                    onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }} />
                  {/* CSS overlay for video preview — actual burn happens on render */}
                  {(() => {
                    const v = variations.find((v) => v.id === previewVarId);
                    if (!v?.spec.text.trim()) return null;
                    const posStyle: React.CSSProperties =
                      v.spec.vPosition === 'top' ? { top: '8%' }
                      : v.spec.vPosition === 'bottom' ? { bottom: '8%' }
                      : { top: '50%', transform: 'translateY(-50%)' };
                    return (
                      <div className="absolute left-4 right-4 pointer-events-none flex items-center justify-center"
                        style={posStyle}>
                        <span className="text-center px-3 py-1.5 rounded-lg font-bold text-sm leading-snug"
                          style={{
                            color: v.spec.color,
                            background: 'rgba(0,0,0,0.45)',
                            fontSize: `${Math.round(v.spec.fontSize * 0.35)}px`,
                            fontWeight: v.spec.bold ? 'bold' : 'normal',
                            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                          }}>
                          {v.spec.text}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Variation selector pills */}
            <div className="flex flex-wrap gap-1.5 justify-center w-full">
              {variations.map((v, idx) => (
                <button key={v.id} onClick={() => setPreviewVarId(v.id)}
                  className="text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all"
                  style={{
                    background: previewVarId === v.id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${previewVarId === v.id ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: previewVarId === v.id ? '#c4b5fd' : 'var(--text-muted)',
                  }}>
                  {v.status === 'done' ? <Check className="w-2.5 h-2.5 inline mr-1 text-green-400" /> : null}
                  V{idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Variation editors */}
          <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
            {variations.map((v, idx) => (
              <div key={v.id}
                onClick={() => setPreviewVarId(v.id)}
                className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all"
                style={{
                  background: previewVarId === v.id ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${previewVarId === v.id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.07)'}`,
                }}>

                {/* Row header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Variation {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    {v.status === 'rendering' && (
                      <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--accent-violet)' }}>
                        <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        Rendering {v.progress}%
                      </div>
                    )}
                    {v.status === 'uploading' && (
                      <span className="text-[10px]" style={{ color: 'var(--accent-violet)' }}>Saving to vault…</span>
                    )}
                    {v.status === 'done' && (
                      <span className="flex items-center gap-1 text-[10px] text-green-400">
                        <Check className="w-3 h-3" /> Saved
                      </span>
                    )}
                    {v.status === 'error' && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400">
                        <AlertCircle className="w-3 h-3" /> {v.errorMsg}
                      </span>
                    )}
                    {variations.length > 1 && v.status === 'idle' && (
                      <button onClick={(e) => { e.stopPropagation(); removeVariation(v.id); }}
                        className="btn-ghost p-0.5 text-zinc-600 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Caption input */}
                <input
                  type="text"
                  value={v.spec.text}
                  onChange={(e) => updateSpec(v.id, { text: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Type caption text to overlay on the post…"
                  disabled={v.status !== 'idle'}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none disabled:opacity-50"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)' }}
                />

                {/* Style controls */}
                <div className="flex items-center gap-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {/* Position */}
                  <div className="flex gap-0.5 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button key={pos}
                        onClick={() => updateSpec(v.id, { vPosition: pos })}
                        disabled={v.status !== 'idle'}
                        className="px-2.5 py-1.5 text-[10px] font-semibold capitalize transition-all disabled:opacity-50"
                        style={{
                          background: v.spec.vPosition === pos ? 'rgba(124,58,237,0.25)' : 'transparent',
                          color: v.spec.vPosition === pos ? '#c4b5fd' : 'var(--text-muted)',
                        }}>
                        {pos}
                      </button>
                    ))}
                  </div>

                  {/* Colors */}
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button key={c} onClick={() => updateSpec(v.id, { color: c })}
                        disabled={v.status !== 'idle'}
                        className="w-5 h-5 rounded-full flex-shrink-0 disabled:opacity-50 transition-transform"
                        style={{
                          background: c,
                          border: v.spec.color === c ? '2.5px solid #7C3AED' : '1.5px solid rgba(255,255,255,0.15)',
                          transform: v.spec.color === c ? 'scale(1.2)' : 'scale(1)',
                        }} />
                    ))}
                  </div>

                  {/* Bold toggle */}
                  <button onClick={() => updateSpec(v.id, { bold: !v.spec.bold })}
                    disabled={v.status !== 'idle'}
                    className="px-2.5 py-1.5 rounded-lg text-sm font-black transition-all disabled:opacity-50"
                    style={{
                      background: v.spec.bold ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${v.spec.bold ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: v.spec.bold ? '#c4b5fd' : 'var(--text-muted)',
                    }}>B</button>

                  {/* Font size */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Size</span>
                    <input type="range" min={24} max={96} value={v.spec.fontSize}
                      onChange={(e) => updateSpec(v.id, { fontSize: Number(e.target.value) })}
                      disabled={v.status !== 'idle'}
                      className="w-20 accent-violet-500 disabled:opacity-50" />
                    <span className="text-[10px] font-mono text-zinc-400 w-6">{v.spec.fontSize}</span>
                  </div>
                </div>

                {/* Render progress bar */}
                {(v.status === 'rendering' || v.status === 'uploading') && (
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${v.status === 'uploading' ? 100 : v.progress}%`, background: '#7C3AED' }} />
                  </div>
                )}
              </div>
            ))}

            {/* Add variation */}
            {variations.length < 5 && (
              <button onClick={addVariation} disabled={running}
                className="flex items-center gap-2 text-sm py-2.5 rounded-xl border border-dashed transition-all disabled:opacity-40"
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'var(--text-muted)' }}>
                <Plus className="w-4 h-4 ml-3" /> Add another variation
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {asset.fileType === 'video'
              ? 'Video renders in real-time — each variation takes as long as the clip'
              : 'Images render instantly'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm py-2 px-4">
              {allDone ? 'Close' : 'Cancel'}
            </button>
            {!allDone && (
              <button
                onClick={handleGenerate}
                disabled={running || !hasText}
                className="btn-primary text-sm py-2 px-5 flex items-center gap-2 disabled:opacity-40"
              >
                <Wand2 className="w-4 h-4" />
                {running ? 'Generating…' : `Generate ${variations.filter(v => v.spec.text.trim()).length} variation${variations.filter(v => v.spec.text.trim()).length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
