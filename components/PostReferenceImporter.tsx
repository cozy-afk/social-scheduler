'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Link,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  Layers,
  Eye,
} from 'lucide-react';
import { CaptionCategory, PostReference } from '@/types/models';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostReferenceImporterProps {
  defaultCategory: CaptionCategory;
  onSave: (ref: PostReference) => void;
  onClose: () => void;
}

type Tab = 'screenshot' | 'url';

type ExtractedData = {
  coverImageUrl: string | null;
  caption: string;       // Hook / first line
  description: string;   // Full post body
  imageCaption: string;  // Text overlay on the image
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Platform detection ───────────────────────────────────────────────────────

type DetectedPlatform = PostReference['sourcePlatform'];

function detectPlatformFromUrl(rawUrl: string): DetectedPlatform {
  try {
    const { hostname } = new URL(rawUrl.trim());
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('threads.net') || hostname.includes('threads.com')) return 'threads';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'x';
  } catch {
    // not a valid URL yet — silent
  }
  return 'unknown';
}

const PLATFORM_BADGE: Record<DetectedPlatform, { label: string; className: string }> = {
  instagram: { label: 'Instagram', className: 'bg-pink-500/20 text-pink-300 border border-pink-500/40' },
  tiktok:    { label: 'TikTok',    className: 'bg-red-500/20 text-red-300 border border-red-500/40' },
  threads:   { label: 'Threads',   className: 'bg-purple-500/20 text-purple-300 border border-purple-500/40' },
  x:         { label: 'X',         className: 'bg-slate-500/20 text-slate-300 border border-slate-500/40' },
  unknown:   { label: 'Unknown',   className: 'bg-slate-700/40 text-slate-400 border border-slate-600/40' },
};

function PlatformBadge({ platform }: { platform: DetectedPlatform }) {
  const { label, className } = PLATFORM_BADGE[platform];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ─── Inline embed preview ─────────────────────────────────────────────────────

function getEmbedUrl(platform: DetectedPlatform, rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const path = url.pathname;
    if (platform === 'instagram') {
      const m = path.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
      if (m) return `https://www.instagram.com/${m[1]}/${m[2]}/embed/`;
    }
    if (platform === 'tiktok') {
      const m = path.match(/\/video\/(\d+)/);
      if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
    }
    if (platform === 'x') {
      const m = path.match(/\/status\/(\d+)/);
      if (m) return `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}&theme=dark&chrome=nofooter`;
    }
    if (platform === 'threads') {
      const m = path.match(/\/([^/]+)\/post\/([A-Za-z0-9_-]+)/);
      if (m) return `https://www.threads.net/${m[1]}/post/${m[2]}/embed`;
    }
  } catch { /* ignore */ }
  return null;
}

const EMBED_HEIGHTS: Record<DetectedPlatform, number> = {
  instagram: 540, tiktok: 700, x: 280, threads: 360, unknown: 400,
};

function InlineEmbedPreview({ platform, url }: { platform: DetectedPlatform; url: string }) {
  const [open, setOpen] = useState(false);
  const embedUrl = getEmbedUrl(platform, url);
  if (!embedUrl) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-white/8 mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/4 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        {open ? 'Hide' : 'Preview'} how it looks on {platform.charAt(0).toUpperCase() + platform.slice(1)}
      </button>
      {open && (
        <div style={{ height: EMBED_HEIGHTS[platform] }}>
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            style={{ background: '#000' }}
          />
        </div>
      )}
    </div>
  );
}

const PLATFORM_OPTIONS: PostReference['sourcePlatform'][] = [
  'instagram',
  'tiktok',
  'threads',
  'x',
  'unknown',
];

const RATING_OPTIONS: { value: 'high' | 'medium' | 'low'; label: string }[] = [
  { value: 'high',   label: '★★★ High performer' },
  { value: 'medium', label: '★★ Medium' },
  { value: 'low',    label: '★ Low' },
];

// ─── Shared preview / save form ───────────────────────────────────────────────

function PreviewForm({
  extracted,
  defaultCategory,
  onFieldChange,
  onSave,
  saved,
}: {
  extracted: ExtractedData;
  defaultCategory: CaptionCategory;
  onFieldChange: (updates: Partial<ExtractedData>) => void;
  onSave: (
    category: CaptionCategory,
    platform: PostReference['sourcePlatform'],
    rating: 'high' | 'medium' | 'low',
    manualCoverUrl: string
  ) => void;
  saved: boolean;
}) {
  const [category, setCategory] = useState<CaptionCategory>(defaultCategory);
  const [platform, setPlatform] = useState<PostReference['sourcePlatform']>('instagram');
  const [rating, setRating] = useState<'high' | 'medium' | 'low'>('high');
  const [manualCoverUrl, setManualCoverUrl] = useState('');

  return (
    <div className="space-y-4 pt-2">
      {/* Cover image */}
      <div>
        <label className="label-dark">Cover Image</label>
        {extracted.coverImageUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={extracted.coverImageUrl}
              alt="Cover"
              className="w-16 h-16 rounded-lg object-cover border border-slate-700"
            />
            <p className="text-xs text-slate-400">Cover image detected from extraction.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 italic">No cover image detected.</p>
            <input
              type="url"
              value={manualCoverUrl}
              onChange={(e) => setManualCoverUrl(e.target.value)}
              placeholder="Optional: paste an image URL"
              className="input-dark text-sm"
            />
          </div>
        )}
      </div>

      {/* Caption (hook) */}
      <div>
        <label className="label-dark">Hook / Opening Line</label>
        <textarea
          value={extracted.caption}
          onChange={(e) => onFieldChange({ caption: e.target.value })}
          rows={2}
          className="input-dark resize-none text-sm"
          placeholder="The first line or hook that grabs attention…"
        />
      </div>

      {/* Description */}
      <div>
        <label className="label-dark">Post Caption (full body)</label>
        <textarea
          value={extracted.description}
          onChange={(e) => onFieldChange({ description: e.target.value })}
          rows={3}
          className="input-dark resize-none text-sm"
          placeholder="Full caption or post body…"
        />
      </div>

      {/* Image caption / text overlay */}
      <div>
        <label className="label-dark flex items-center gap-1.5">
          <span className="text-amber-400">T</span>
          Image Text Overlay
          <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>— text printed ON the image</span>
        </label>
        <textarea
          value={extracted.imageCaption}
          onChange={(e) => onFieldChange({ imageCaption: e.target.value })}
          rows={2}
          className="input-dark resize-none text-sm"
          placeholder="Text visible on the image itself (e.g. slide text, overlay caption)…"
        />
      </div>

      {/* Platform */}
      <div>
        <label className="label-dark">Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as PostReference['sourcePlatform'])}
          className="input-dark text-sm"
        >
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Performance rating */}
      <div>
        <label className="label-dark">Performance Rating</label>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value as 'high' | 'medium' | 'low')}
          className="input-dark text-sm"
        >
          {RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="label-dark">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CaptionCategory)}
          className="input-dark text-sm"
        >
          <option value="ig_reels">IG Reels</option>
          <option value="ig_post">IG Post</option>
          <option value="tiktok_slideshow">TikTok Slideshow</option>
          <option value="tiktok_reel">TikTok Reels</option>
          <option value="threads_post">Threads</option>
          <option value="x_post">X (Twitter)</option>
          <option value="general">General</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => onSave(category, platform, rating, manualCoverUrl)}
        disabled={(!extracted.caption.trim() && !extracted.description.trim()) || saved}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" /> Saved!
          </>
        ) : (
          'Save to Post References'
        )}
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
  onSave: (ref: PostReference) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [saved, setSaved] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setExtracted(null);
    setError('');
    setSaved(false);
  };

  const handleExtract = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError('');
    try {
      const imageBase64 = await fileToBase64(imageFile);
      const res = await fetch('/api/extract-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'post-reference', imageBase64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setExtracted({
        coverImageUrl: data.coverImageUrl ?? null,
        caption: data.caption ?? '',
        description: data.description ?? '',
        imageCaption: data.imageCaption ?? '',
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to extract');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (
    category: CaptionCategory,
    platform: PostReference['sourcePlatform'],
    rating: 'high' | 'medium' | 'low',
    manualCoverUrl: string
  ) => {
    if (!extracted) return;
    const ref: PostReference = {
      id: `ref-screenshot-${Date.now()}`,
      coverImageUrl: extracted.coverImageUrl || manualCoverUrl || null,
      caption: extracted.caption,
      description: extracted.description,
      imageCaption: extracted.imageCaption || undefined,
      sourcePlatform: platform,
      createdAt: new Date().toISOString(),
      tags: [],
      category,
      performanceRating: rating,
    };
    onSave(ref);
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Upload a screenshot of a social media post. Claude Vision will extract the caption and
        description automatically.
      </p>

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          preview
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-slate-600 hover:border-slate-500 bg-slate-800/40'
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
            <p className="text-slate-300 text-sm font-medium">
              Drop screenshot or click to upload
            </p>
            <p className="text-slate-500 text-xs">JPG, PNG, WebP</p>
          </div>
        )}
      </div>

      {/* Extract button */}
      {imageFile && !extracted && (
        <button
          type="button"
          onClick={handleExtract}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Extracting with Claude Vision…
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" /> Extract with Claude Vision
            </>
          )}
        </button>
      )}

      {/* Re-extract */}
      {imageFile && extracted && (
        <button
          type="button"
          onClick={() => {
            setExtracted(null);
            setSaved(false);
          }}
          className="btn-secondary text-sm flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-extract
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      {extracted && (
        <PreviewForm
          extracted={extracted}
          defaultCategory={defaultCategory}
          onFieldChange={(updates) =>
            setExtracted((prev) => (prev ? { ...prev, ...updates } : prev))
          }
          onSave={handleSave}
          saved={saved}
        />
      )}
    </div>
  );
}

// ─── URL Tab ──────────────────────────────────────────────────────────────────

function URLTab({
  defaultCategory,
  onSave,
}: {
  defaultCategory: CaptionCategory;
  onSave: (ref: PostReference) => void;
}) {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<DetectedPlatform>('unknown');
  const [detectedSlides, setDetectedSlides] = useState<number | null>(null);
  const [detectingSlides, setDetectingSlides] = useState(false);
  const [extractOnImageText, setExtractOnImageText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [saved, setSaved] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');

  // Auto-detect platform whenever the URL changes
  useEffect(() => {
    const platform = detectPlatformFromUrl(url);
    setDetectedPlatform(platform);
    // Reset slide detection when URL changes
    setDetectedSlides(null);
    setExtracted(null);
    setSaved(false);
    setError('');
  }, [url]);

  const handleDetectSlides = async () => {
    if (!url.trim()) return;
    setDetectingSlides(true);
    try {
      const res = await fetch('/api/extract-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'detect-slides', url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Detection failed');
      setDetectedSlides(typeof data.slideCount === 'number' ? data.slideCount : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Slide detection failed');
    } finally {
      setDetectingSlides(false);
    }
  };

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setSourceUrl(url.trim());
    try {
      // Step 1: fetch basic metadata
      const res = await fetch('/api/extract-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'post-reference', url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');

      let coverImageUrl: string | null = data.coverImageUrl ?? null;
      let caption: string = data.caption ?? '';
      let description: string = data.description ?? '';
      let imageCaption: string = data.imageCaption ?? '';

      // Step 2: if on-image text extraction is on and we have a cover image, do vision analysis
      if (extractOnImageText && coverImageUrl) {
        try {
          const visionRes = await fetch('/api/extract-caption', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'post-reference', coverImageUrl }),
          });
          if (visionRes.ok) {
            const visionData = await visionRes.json();
            // Use imageCaption from vision if available, else look in description
            if (visionData.imageCaption) {
              imageCaption = visionData.imageCaption;
            } else if (visionData.description && visionData.description.includes('On-image text:')) {
              const onImagePart = visionData.description
                .split('\n')
                .filter((line: string) => line.startsWith('On-image text:'))
                .map((line: string) => line.replace('On-image text:', '').trim())
                .join('\n');
              if (onImagePart) imageCaption = onImagePart;
            }
          }
        } catch {
          // Vision step is best-effort; don't block the import
        }
      }

      setExtracted({ coverImageUrl, caption, description, imageCaption });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (
    category: CaptionCategory,
    platform: PostReference['sourcePlatform'],
    rating: 'high' | 'medium' | 'low',
    manualCoverUrl: string
  ) => {
    if (!extracted) return;
    const ref: PostReference = {
      id: `ref-url-${Date.now()}`,
      coverImageUrl: extracted.coverImageUrl || manualCoverUrl || null,
      caption: extracted.caption,
      description: extracted.description,
      imageCaption: extracted.imageCaption || undefined,
      sourceUrl: sourceUrl || undefined,
      sourcePlatform: platform,
      createdAt: new Date().toISOString(),
      tags: [],
      category,
      performanceRating: rating,
    };
    onSave(ref);
    setSaved(true);
  };

  const showPlatformBadge = url.trim().length > 0 && detectedPlatform !== 'unknown';

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Paste a TikTok or Instagram post URL. Platform is detected automatically.
      </p>

      {/* URL input row */}
      <div className="space-y-2">
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
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link className="w-4 h-4" />
            )}
            Import
          </button>
        </div>

        {/* Platform badge + slide detection row */}
        {url.trim().length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {showPlatformBadge && <PlatformBadge platform={detectedPlatform} />}
            {detectedPlatform === 'unknown' && url.trim().length > 8 && (
              <span className="text-xs text-slate-500 italic">Platform not recognised</span>
            )}

            {/* Slide detection: TikTok only */}
            {detectedPlatform === 'tiktok' && (
              <>
                <button
                  type="button"
                  onClick={handleDetectSlides}
                  disabled={detectingSlides}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600/60 hover:bg-slate-700 transition-colors"
                >
                  {detectingSlides ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Layers className="w-3 h-3" />
                  )}
                  Detect Slides
                </button>
                {detectedSlides !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    <Layers className="w-3 h-3" />
                    {detectedSlides} {detectedSlides === 1 ? 'slide' : 'slides'} detected
                  </span>
                )}
              </>
            )}

            {/* Instagram: always 1 slide */}
            {detectedPlatform === 'instagram' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/40 text-slate-400 border border-slate-600/40">
                <Layers className="w-3 h-3" />
                1 slide (default)
              </span>
            )}
          </div>
        )}

        {/* Native embed preview */}
        {detectedPlatform !== 'unknown' && url.trim().length > 0 && (
          <InlineEmbedPreview platform={detectedPlatform} url={url.trim()} />
        )}
      </div>

      {/* On-image text extraction toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={extractOnImageText}
          onChange={(e) => setExtractOnImageText(e.target.checked)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
        />
        <span className="text-xs text-slate-300">Extract text from slide images</span>
      </label>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      {extracted && (
        <>
          {extracted.caption === '' && extracted.description !== '' && (
            <p className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
              Caption pre-filled from URL metadata — edit as needed.
            </p>
          )}
          <PreviewForm
            extracted={extracted}
            defaultCategory={defaultCategory}
            onFieldChange={(updates) =>
              setExtracted((prev) => (prev ? { ...prev, ...updates } : prev))
            }
            onSave={handleSave}
            saved={saved}
          />
        </>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function PostReferenceImporter({
  defaultCategory,
  onSave,
  onClose,
}: PostReferenceImporterProps) {
  const [tab, setTab] = useState<Tab>('screenshot');

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'screenshot', label: 'Screenshot', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'url', label: 'URL', icon: <Link className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Import Post Reference</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              into{' '}
              <span className="text-slate-200 font-medium capitalize">
                {defaultCategory.replace(/_/g, ' ')}
              </span>
            </p>
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
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'screenshot' && (
            <ScreenshotTab defaultCategory={defaultCategory} onSave={onSave} />
          )}
          {tab === 'url' && (
            <URLTab defaultCategory={defaultCategory} onSave={onSave} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700/60 px-5 py-3 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
