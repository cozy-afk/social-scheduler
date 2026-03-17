'use client';

import { useStore } from '@/lib/store';
import { useMemo, useState, useCallback, useRef } from 'react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import {
  Download, CheckCircle2, Copy, Check, Link,
  AlertCircle, Clock, ChevronDown, ChevronUp, ExternalLink,
  Image as ImageIcon, FileVideo, Layers, Clipboard, CheckCheck,
} from 'lucide-react';
import { Post, Platform } from '@/types/models';
import clsx from 'clsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<Platform, { bg: string; text: string; dot: string }> = {
  instagram: { bg: 'bg-pink-500/15',   text: 'text-pink-300',   dot: 'bg-pink-500'   },
  tiktok:    { bg: 'bg-red-500/15',    text: 'text-red-300',    dot: 'bg-red-500'    },
  threads:   { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-500' },
  x:         { bg: 'bg-slate-500/15',  text: 'text-slate-300',  dot: 'bg-slate-400'  },
  fanvue:    { bg: 'bg-orange-500/15', text: 'text-orange-300', dot: 'bg-orange-500' },
};

const PLATFORM_ICON: Record<Platform, string> = {
  instagram: '📸', tiktok: '🎵', threads: '🧵', x: '𝕏', fanvue: '🎭',
};

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', threads: 'Threads', x: 'X', fanvue: 'Fanvue',
};

const POST_TYPE_LABEL: Record<string, string> = {
  instagram_post: 'Post', instagram_reel: 'Reel', instagram_story: 'Story',
  tiktok_reel: 'Reel', tiktok_slideshow: 'Slideshow', tiktok_story: 'Story',
  x_post: 'Post', threads_post: 'Post', fanvue_post: 'Post',
};

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={clsx(
        'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex-shrink-0',
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-white/6 hover:bg-white/10 text-zinc-300 border border-white/10'
      )}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ─── Download helper ──────────────────────────────────────────────────────────

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function buildFilename(post: Post, assetOrder: number, total: number): string {
  const date = format(parseISO(post.scheduledTime), 'MMdd');
  const time = format(parseISO(post.scheduledTime), 'HHmm');
  const platform = PLATFORM_LABEL[post.platform];
  const kind = POST_TYPE_LABEL[post.postType] ?? 'Post';
  const ext = post.assets[assetOrder - 1]?.fileType === 'video' ? 'mp4' : 'jpg';
  return total > 1
    ? `${platform}_${kind}_${date}_${time}_${assetOrder}of${total}.${ext}`
    : `${platform}_${kind}_${date}_${time}.${ext}`;
}

// ─── Platform URL patterns ────────────────────────────────────────────────────

const PLATFORM_URL_PATTERNS: Record<Platform, RegExp[]> = {
  instagram: [/instagram\.com\/(p|reel|stories)\/[\w-]+/i],
  tiktok:    [/tiktok\.com\/@[\w.]+\/video\/\d+/i, /vm\.tiktok\.com\/\w+/i],
  threads:   [/threads\.net\/@[\w.]+\/post\/[\w-]+/i],
  x:         [/x\.com\/\w+\/status\/\d+/i, /twitter\.com\/\w+\/status\/\d+/i],
  fanvue:    [/fanvue\.com\//i],
};

function isPlatformUrl(url: string, platform: Platform): boolean {
  return PLATFORM_URL_PATTERNS[platform].some((re) => re.test(url));
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  post: Post;
  onComplete: (postId: string, postedUrl: string) => void;
}

type ClipboardState = 'idle' | 'reading' | 'detected' | 'not-found' | 'denied';

function TaskCard({ post, onComplete }: TaskCardProps) {
  const [urlInput, setUrlInput] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [downloadedAll, setDownloadedAll] = useState(false);
  const [clipState, setClipState] = useState<ClipboardState>('idle');
  const urlRef = useRef<HTMLInputElement>(null);

  const colors = PLATFORM_COLORS[post.platform];
  const scheduledAt = parseISO(post.scheduledTime);
  const overdue = isPast(scheduledAt) && post.status !== 'completed';

  const timeLabel = isToday(scheduledAt)
    ? `Today · ${format(scheduledAt, 'h:mm a')}`
    : isTomorrow(scheduledAt)
    ? `Tomorrow · ${format(scheduledAt, 'h:mm a')}`
    : format(scheduledAt, 'MMM d · h:mm a');

  const isMultiAsset = post.assets.length > 1;
  const firstAsset = post.assets[0];
  const hasRealUrl = firstAsset?.fileUrl?.startsWith('http') || firstAsset?.fileUrl?.startsWith('/');

  const handleDownloadAll = useCallback(() => {
    post.assets.forEach((asset) => {
      const filename = buildFilename(post, asset.order, post.assets.length);
      triggerDownload(asset.fileUrl, filename);
    });
    setDownloadedAll(true);
  }, [post]);

  const handleDownloadSingle = useCallback((idx: number) => {
    const asset = post.assets[idx];
    const filename = buildFilename(post, asset.order, post.assets.length);
    triggerDownload(asset.fileUrl, filename);
  }, [post]);

  // Try to read URL from clipboard. Called both when the confirm panel opens
  // and when the VA taps the "Read from clipboard" button.
  const tryReadClipboard = useCallback(async () => {
    setClipState('reading');
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text.startsWith('http') && isPlatformUrl(text, post.platform)) {
        setUrlInput(text);
        setUrlError('');
        setClipState('detected');
      } else if (text.startsWith('http')) {
        // Valid URL but wrong platform — still fill it, just warn
        setUrlInput(text);
        setUrlError(`Heads up: this looks like a different platform's link`);
        setClipState('not-found');
      } else {
        setClipState('not-found');
      }
    } catch {
      // Permission denied or API unavailable
      setClipState('denied');
    }
    setTimeout(() => urlRef.current?.focus(), 50);
  }, [post.platform]);

  const handleMarkPosted = useCallback(() => {
    setShowUrlField(true);
    // Attempt auto-read immediately on button press
    tryReadClipboard();
  }, [tryReadClipboard]);

  const handleConfirm = useCallback(() => {
    const url = urlInput.trim();
    if (!url) {
      setUrlError('Copy the post link first, then tap Read from clipboard');
      return;
    }
    if (!url.startsWith('http')) {
      setUrlError('URL should start with https://');
      return;
    }
    onComplete(post.id, url);
  }, [urlInput, post.id, onComplete]);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: overdue ? '0 0 0 1px rgba(239,68,68,0.1)' : 'none',
      }}
    >
      {/* Header */}
      <div
        className={clsx('flex items-center justify-between px-4 py-2.5', colors.bg)}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{PLATFORM_ICON[post.platform]}</span>
          <span className={clsx('text-xs font-bold', colors.text)}>
            {PLATFORM_LABEL[post.platform]} {POST_TYPE_LABEL[post.postType]}
          </span>
          {isMultiAsset && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#aaa' }}>
              <Layers className="w-3 h-3" />
              {post.assets.length}
            </span>
          )}
        </div>
        <div className={clsx('flex items-center gap-1.5 text-[11px] font-semibold', overdue ? 'text-red-400' : 'text-zinc-400')}>
          {overdue && <AlertCircle className="w-3.5 h-3.5" />}
          <Clock className="w-3 h-3" />
          {timeLabel}
        </div>
      </div>

      {/* Asset preview */}
      <div className="relative w-full" style={{ background: '#0a0a0a' }}>
        {firstAsset?.fileType === 'video' ? (
          <div className="flex items-center justify-center py-10">
            <div className="flex flex-col items-center gap-2">
              <FileVideo className="w-10 h-10 text-zinc-600" />
              <span className="text-xs text-zinc-500">Video asset</span>
            </div>
          </div>
        ) : hasRealUrl ? (
          <img
            src={firstAsset.fileUrl}
            alt=""
            className="w-full object-cover"
            style={{ maxHeight: 280 }}
          />
        ) : (
          <div className="flex items-center justify-center py-10">
            <ImageIcon className="w-10 h-10 text-zinc-700" />
          </div>
        )}

        {/* Multi-asset strip */}
        {isMultiAsset && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {post.assets.map((_, i) => (
              <div key={i} className={clsx('rounded-full transition-all',
                i === 0 ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40')} />
            ))}
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="px-4 py-3 space-y-3">

        {/* Description */}
        {post.description ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Description (post body)
              </span>
              <CopyButton text={post.description} label="Copy" />
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.07)' }}>
              {post.description}
            </p>
          </div>
        ) : (
          <div className="text-xs text-zinc-600 italic px-1">No description set</div>
        )}

        {/* Image caption overlay */}
        {post.imageCaption && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Text on image
              </span>
              <CopyButton text={post.imageCaption} label="Copy" />
            </div>
            <div className="text-sm font-medium text-violet-200 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
              "{post.imageCaption}"
            </div>
          </div>
        )}

        {/* Downloads */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Assets
          </span>
          {post.assets.length === 1 ? (
            <button
              onClick={() => handleDownloadSingle(0)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <Download className="w-4 h-4" />
              Download {firstAsset?.fileType === 'video' ? 'Video' : 'Image'}
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(post.assets.length, 3)}, 1fr)` }}>
                {post.assets.map((asset, idx) => (
                  <button
                    key={asset.id}
                    onClick={() => handleDownloadSingle(idx)}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-semibold text-zinc-300 transition-all active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {asset.fileType === 'video' ? 'Video' : `Slide ${idx + 1}`}
                  </button>
                ))}
              </div>
              <button
                onClick={handleDownloadAll}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95',
                  downloadedAll ? 'text-green-400' : 'text-white'
                )}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                {downloadedAll ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {downloadedAll ? 'All downloaded' : `Download All (${post.assets.length})`}
              </button>
            </div>
          )}
        </div>

        {/* Mark as posted / URL confirmation */}
        {!showUrlField ? (
          <button
            onClick={handleMarkPosted}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
          >
            <CheckCircle2 className="w-4 h-4" />
            I've posted it — confirm
          </button>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)' }}>
            <div className="px-3 pt-3 pb-2 space-y-2">

              {/* Instruction */}
              <p className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                {clipState === 'detected'
                  ? 'Link detected from clipboard ✓'
                  : clipState === 'reading'
                  ? 'Reading clipboard…'
                  : 'Copy the post link, then tap below'}
              </p>

              {/* Auto-read button */}
              {clipState !== 'detected' && (
                <button
                  onClick={tryReadClipboard}
                  disabled={clipState === 'reading'}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95',
                    clipState === 'reading'
                      ? 'opacity-50 cursor-not-allowed text-zinc-400'
                      : 'text-white'
                  )}
                  style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.35)' }}
                >
                  {clipState === 'reading'
                    ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <Clipboard className="w-4 h-4" />}
                  {clipState === 'denied' ? 'Paste manually below' : 'Read from clipboard'}
                </button>
              )}

              {/* Detected URL preview or manual input */}
              {clipState === 'detected' ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <CheckCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-xs text-green-300 truncate flex-1">{urlInput}</span>
                  <button
                    onClick={() => { setClipState('not-found'); setUrlInput(''); }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <input
                  ref={urlRef}
                  type="url"
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  placeholder="Or paste the URL manually…"
                  className="w-full text-sm text-white rounded-lg px-3 py-2 focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${urlError ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.25)'}` }}
                />
              )}

              {urlError && <p className="text-[11px] text-amber-400">{urlError}</p>}
            </div>

            <div className="flex gap-2 px-3 pb-3">
              <button
                onClick={() => { setShowUrlField(false); setUrlInput(''); setUrlError(''); setClipState('idle'); }}
                className="flex-1 py-2 text-xs font-semibold text-zinc-400 rounded-lg transition-colors hover:text-white"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-[2] py-2 text-sm font-bold text-white rounded-lg transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                ✓ Confirm & Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Completed Card (compact) ─────────────────────────────────────────────────

function CompletedCard({ post }: { post: Post }) {
  const colors = PLATFORM_COLORS[post.platform];
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl opacity-60"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      <span className="text-sm">{PLATFORM_ICON[post.platform]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">
          {PLATFORM_LABEL[post.platform]} {POST_TYPE_LABEL[post.postType]}
        </p>
        <p className="text-[10px] text-zinc-500">
          Posted {post.completedAt ? format(parseISO(post.completedAt), 'h:mm a') : ''}
        </p>
      </div>
      {post.postedUrl && (
        <a
          href={post.postedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] font-semibold text-violet-400 hover:text-violet-300 flex-shrink-0"
        >
          View <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VATaskQueue() {
  const { models, selectedModelId, posts, currentUser, updatePost } = useStore();
  const [showCompleted, setShowCompleted] = useState(false);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  const { pending, completed } = useMemo(() => {
    if (!selectedModel || !currentUser) return { pending: [], completed: [] };
    const modelPosts = posts.filter(
      (p) =>
        p.modelId === selectedModel.id &&
        (!p.assignedVaId || p.assignedVaId === currentUser.id)
    ).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

    return {
      pending: modelPosts.filter((p) => p.status !== 'completed'),
      completed: modelPosts.filter((p) => p.status === 'completed'),
    };
  }, [selectedModel, posts, currentUser]);

  const overdue = pending.filter((p) => isPast(parseISO(p.scheduledTime)));
  const upcoming = pending.filter((p) => !isPast(parseISO(p.scheduledTime)));

  const handleComplete = useCallback((postId: string, postedUrl: string) => {
    updatePost(postId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: currentUser?.id,
      postedUrl,
    });
  }, [updatePost, currentUser]);

  if (!selectedModel) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <p>No model assigned</p>
      </div>
    );
  }

  if (pending.length === 0 && completed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <CheckCircle2 className="w-14 h-14 text-green-500/40" />
        <p className="text-white font-bold text-lg">All done!</p>
        <p className="text-zinc-500 text-sm">No pending posts for {selectedModel.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">
            {selectedModel.profileImage} {selectedModel.name}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {pending.length > 0
              ? `${pending.length} post${pending.length !== 1 ? 's' : ''} to publish`
              : 'All posted today'}
          </p>
        </div>
        {overdue.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle className="w-3.5 h-3.5" />
            {overdue.length} overdue
          </div>
        )}
      </div>

      {/* Overdue posts first */}
      {overdue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Overdue</p>
          </div>
          {overdue.map((post) => (
            <TaskCard key={post.id} post={post} onComplete={handleComplete} />
          ))}
        </div>
      )}

      {/* Upcoming posts */}
      {upcoming.length > 0 && (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Upcoming</p>
            </div>
          )}
          {upcoming.map((post) => (
            <TaskCard key={post.id} post={post} onComplete={handleComplete} />
          ))}
        </div>
      )}

      {/* Completed today (collapsible) */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="w-full flex items-center justify-between py-2 px-1 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              {completed.length} completed
            </div>
            {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showCompleted && (
            <div className="space-y-2 mt-2">
              {completed.map((post) => (
                <CompletedCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
