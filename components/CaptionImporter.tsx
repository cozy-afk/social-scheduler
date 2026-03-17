'use client';

import { useState, useRef } from 'react';
import {
  X, Upload, Link, Layers, Loader2, Check,
  AlertCircle, Image as ImageIcon, Scissors, RefreshCw,
} from 'lucide-react';
import { Caption, CaptionCategory, Platform, PostType } from '@/types/models';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaptionImporterProps {
  defaultCategory: CaptionCategory;
  onSave: (captions: Caption[]) => void;
  onClose: () => void;
}

type Tab = 'url' | 'screenshot' | 'slideshow';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_TO_PLATFORM: Record<CaptionCategory, { platform: Platform; postType: PostType }> = {
  ig_reels:         { platform: 'instagram', postType: 'instagram_reel' },
  ig_post:          { platform: 'instagram', postType: 'instagram_post' },
  tiktok_slideshow: { platform: 'tiktok',    postType: 'tiktok_slideshow' },
  tiktok_reel:      { platform: 'tiktok',    postType: 'tiktok_reel' },
  threads_post:     { platform: 'threads',   postType: 'threads_post' },
  x_post:           { platform: 'x',         postType: 'x_post' },
  general:          { platform: 'instagram', postType: 'instagram_post' },
};

const RATING_OPTIONS: { value: 'high' | 'medium' | 'low'; label: string }[] = [
  { value: 'high',   label: '⭐⭐⭐ High performer' },
  { value: 'medium', label: '⭐⭐ Medium' },
  { value: 'low',    label: '⭐ Low' },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix — API only wants the raw base64
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── URL Tab ─────────────────────────────────────────────────────────────────

function URLTab({
  defaultCategory,
  onSave,
}: {
  defaultCategory: CaptionCategory;
  onSave: (captions: Caption[]) => void;
}) {
  const [url, setUrl]             = useState('');
  const [captionText, setCaptionText] = useState('');
  const [fetchedHandle, setFetchedHandle] = useState('');
  const [loading, setLoading]     = useState(false);
  const [fetchNote, setFetchNote] = useState('');
  const [rating, setRating]       = useState<'high' | 'medium' | 'low'>('high');
  const [saved, setSaved]         = useState(false);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setFetchNote('');
    try {
      // TikTok oEmbed is a public API — works in dev; in production proxy via /api/oembed-proxy if CORS blocks
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const res = await fetch(oembedUrl);
      if (!res.ok) throw new Error('oEmbed fetch failed');
      const data = await res.json();
      if (data.title)       setCaptionText(data.title);
      if (data.author_name) setFetchedHandle(`@${data.author_name}`);
      setFetchNote('Caption pre-filled from post metadata — edit as needed.');
    } catch {
      setFetchNote('Could not auto-fetch caption. Paste it manually below.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!captionText.trim()) return;
    const { platform, postType } = CATEGORY_TO_PLATFORM[defaultCategory];
    onSave([
      {
        id: `cap-url-${Date.now()}`,
        category: defaultCategory,
        platform,
        postType,
        text: captionText.trim(),
        performanceRating: rating,
        tags: [],
        createdAt: new Date().toISOString(),
        sourceUrl: url.trim() || undefined,
      },
    ]);
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Paste a TikTok or Instagram post URL. We'll try to pre-fill the caption from the post.
      </p>

      {/* URL input + fetch */}
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@handle/video/..."
          className="input-dark flex-1 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="btn-secondary text-sm flex items-center gap-1.5 flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Fetch
        </button>
      </div>

      {/* Fetch result note */}
      {fetchNote && (
        <p className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
          {fetchedHandle && <span className="font-semibold">{fetchedHandle} · </span>}
          {fetchNote}
        </p>
      )}

      {/* Caption textarea */}
      <div>
        <label className="label-dark">Caption Text</label>
        <textarea
          value={captionText}
          onChange={(e) => setCaptionText(e.target.value)}
          rows={4}
          placeholder="Paste or type the caption here…"
          className="input-dark resize-none text-sm"
        />
        <p className="text-xs text-slate-500 mt-1">{captionText.length} characters</p>
      </div>

      {/* Rating */}
      <div>
        <label className="label-dark">Performance Rating</label>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value as 'high' | 'medium' | 'low')}
          className="input-dark text-sm"
        >
          {RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!captionText.trim() || saved}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save to Library'}
      </button>
    </div>
  );
}

// ─── Screenshot Tab ───────────────────────────────────────────────────────────

function ScreenshotTab({
  defaultCategory,
  onSave,
}: {
  defaultCategory: CaptionCategory;
  onSave: (captions: Caption[]) => void;
}) {
  const fileRef              = useRef<HTMLInputElement>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [mimeType, setMimeType]   = useState('image/jpeg');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState('');
  const [error, setError]         = useState('');
  const [rating, setRating]       = useState<'high' | 'medium' | 'low'>('high');
  const [saved, setSaved]         = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setExtracted('');
    setError('');
    setSaved(false);
  };

  const handleExtract = async () => {
    if (!imageFile) return;
    setExtracting(true);
    setError('');
    try {
      const base64 = await fileToBase64(imageFile);
      const res = await fetch('/api/extract-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'screenshot', imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setExtracted(data.extractedText || '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to extract');
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = () => {
    if (!extracted.trim()) return;
    const { platform, postType } = CATEGORY_TO_PLATFORM[defaultCategory];
    onSave([
      {
        id: `cap-screenshot-${Date.now()}`,
        category: defaultCategory,
        platform,
        postType,
        text: extracted.trim(),
        performanceRating: rating,
        tags: [],
        createdAt: new Date().toISOString(),
      },
    ]);
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Upload a screenshot of a social media post. Claude will read and extract the caption text.
      </p>

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          preview ? 'border-green-500/40 bg-green-500/5' : 'border-slate-600 hover:border-slate-500 bg-slate-800/40'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {preview ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={preview}
              alt="Screenshot preview"
              className="max-h-40 rounded-lg object-contain border border-slate-700"
            />
            <p className="text-xs text-slate-400">Click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <ImageIcon className="w-10 h-10 text-slate-600" />
            <p className="text-slate-300 text-sm font-medium">Drop screenshot or click to upload</p>
            <p className="text-slate-500 text-xs">JPG, PNG, WebP</p>
          </div>
        )}
      </div>

      {/* Extract button */}
      {imageFile && !extracted && (
        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          {extracting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting with Claude Vision…</>
            : <><Scissors className="w-4 h-4" /> Extract Caption</>
          }
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      {/* Extracted text for review */}
      {extracted && (
        <div className="space-y-3">
          <div>
            <label className="label-dark">Extracted Caption — review &amp; edit</label>
            <textarea
              value={extracted}
              onChange={(e) => setExtracted(e.target.value)}
              rows={4}
              className="input-dark resize-none text-sm"
            />
          </div>

          <div>
            <label className="label-dark">Performance Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value as 'high' | 'medium' | 'low')}
              className="input-dark text-sm"
            >
              {RATING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExtract}
              disabled={extracting}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-extract
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!extracted.trim() || saved}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
            >
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save to Library'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TikTok Slideshow Tab ─────────────────────────────────────────────────────

function SlideshowTab({
  onSave,
}: {
  onSave: (captions: Caption[]) => void;
}) {
  const [url, setUrl]               = useState('');
  const [combinedText, setCombinedText] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [splitting, setSplitting]   = useState(false);
  const [slides, setSlides]         = useState<string[]>([]);
  const [error, setError]           = useState('');
  const [rating, setRating]         = useState<'high' | 'medium' | 'low'>('high');
  const [saved, setSaved]           = useState(false);

  const handleSplit = async () => {
    if (!combinedText.trim()) return;
    setSplitting(true);
    setError('');
    try {
      const res = await fetch('/api/extract-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'slideshow', combinedText, slideCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Split failed');
      setSlides(data.slides || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Split failed');
    } finally {
      setSplitting(false);
    }
  };

  const handleSlideEdit = (i: number, val: string) => {
    setSlides((prev) => { const next = [...prev]; next[i] = val; return next; });
  };

  const handleSave = () => {
    const filled = slides.filter((s) => s.trim());
    if (filled.length === 0) return;
    onSave(
      filled.map((text, i) => ({
        id: `cap-slide-${Date.now()}-${i}`,
        category: 'tiktok_slideshow' as CaptionCategory,
        platform: 'tiktok' as Platform,
        postType: 'tiktok_slideshow' as PostType,
        text: text.trim(),
        performanceRating: rating,
        tags: [],
        createdAt: new Date().toISOString(),
        sourceUrl: url.trim() || undefined,
      }))
    );
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Paste the TikTok slideshow URL and the full combined caption text. Claude will split it into per-slide captions.
      </p>

      {/* URL */}
      <div>
        <label className="label-dark">Slideshow URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@handle/photo/..."
          className="input-dark text-sm"
        />
      </div>

      {/* Combined text */}
      <div>
        <label className="label-dark">Full Caption Text</label>
        <textarea
          value={combinedText}
          onChange={(e) => setCombinedText(e.target.value)}
          rows={4}
          placeholder="Paste the complete caption (all slides combined or the post description)…"
          className="input-dark resize-none text-sm"
        />
      </div>

      {/* Slide count */}
      <div>
        <label className="label-dark">Number of Slides</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={2}
            max={20}
            value={slideCount}
            onChange={(e) => setSlideCount(Number(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <span className="w-8 text-center font-mono text-slate-200 font-semibold">{slideCount}</span>
        </div>
      </div>

      {/* Split button */}
      {!slides.length && (
        <button
          type="button"
          onClick={handleSplit}
          disabled={splitting || !combinedText.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          {splitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Splitting with Claude…</>
            : <><Layers className="w-4 h-4" /> Split into {slideCount} Slides</>
          }
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      {/* Per-slide editing */}
      {slides.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {slides.length} Slide Captions — edit each
            </p>
            <button
              type="button"
              onClick={() => { setSlides([]); setSaved(false); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Re-split
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {slides.map((slide, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[11px] font-mono text-slate-500 pt-2.5 w-6 flex-shrink-0 text-right">
                  {i + 1}
                </span>
                <textarea
                  value={slide}
                  onChange={(e) => handleSlideEdit(i, e.target.value)}
                  rows={2}
                  className="input-dark resize-none text-sm flex-1 py-2"
                  placeholder={`Slide ${i + 1} caption…`}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="label-dark">Performance Rating (applies to all slides)</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value as 'high' | 'medium' | 'low')}
              className="input-dark text-sm"
            >
              {RATING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            {saved
              ? <><Check className="w-4 h-4" /> Saved {slides.filter((s) => s.trim()).length} Slides!</>
              : <>Save {slides.filter((s) => s.trim()).length} Slide Captions</>
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function CaptionImporter({ defaultCategory, onSave, onClose }: CaptionImporterProps) {
  const [tab, setTab] = useState<Tab>('url');

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'url',        label: 'URL Import',       icon: <Link className="w-4 h-4" /> },
    { id: 'screenshot', label: 'Screenshot',        icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'slideshow',  label: 'TikTok Slideshow',  icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="border-b border-slate-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Import Caption</h2>
            <p className="text-xs text-slate-400 mt-0.5">into <span className="text-slate-200 font-medium capitalize">{defaultCategory.replace(/_/g, ' ')}</span></p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-700/60 flex-shrink-0">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-all ${
                tab === id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'url'        && <URLTab        defaultCategory={defaultCategory} onSave={(c) => { onSave(c); }} />}
          {tab === 'screenshot' && <ScreenshotTab defaultCategory={defaultCategory} onSave={(c) => { onSave(c); }} />}
          {tab === 'slideshow'  && <SlideshowTab  onSave={(c) => { onSave(c); }} />}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700/60 px-5 py-3 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm">Done</button>
        </div>
      </div>
    </div>
  );
}
