'use client';

import { useState } from 'react';
import { Copy, Check, Trash2, ExternalLink, ChevronDown, Type } from 'lucide-react';
import { PostReference } from '@/types/models';

// ─── Platform config ──────────────────────────────────────────────────────────

type Platform = PostReference['sourcePlatform'];

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; textColor: string; borderColor: string }> = {
  instagram: { label: 'Instagram', color: 'rgba(236,72,153,0.12)', textColor: '#f9a8d4', borderColor: 'rgba(236,72,153,0.3)' },
  tiktok:    { label: 'TikTok',    color: 'rgba(239,68,68,0.12)',  textColor: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' },
  threads:   { label: 'Threads',   color: 'rgba(168,85,247,0.12)', textColor: '#d8b4fe', borderColor: 'rgba(168,85,247,0.3)' },
  x:         { label: 'X',         color: 'rgba(148,163,184,0.12)',textColor: '#cbd5e1', borderColor: 'rgba(148,163,184,0.3)' },
  unknown:   { label: 'Unknown',   color: 'rgba(100,116,139,0.10)',textColor: '#94a3b8', borderColor: 'rgba(100,116,139,0.2)' },
};

const RATING: Record<'high' | 'medium' | 'low', { stars: number; color: string }> = {
  high:   { stars: 3, color: '#4ade80' },
  medium: { stars: 2, color: '#fcd34d' },
  low:    { stars: 1, color: '#71717a' },
};

// ─── Native embed helpers ─────────────────────────────────────────────────────

function getEmbedUrl(platform: Platform, sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    const path = url.pathname;

    if (platform === 'instagram') {
      // Matches /p/SHORTCODE/ and /reel/SHORTCODE/
      const match = path.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
      if (match) return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
    }

    if (platform === 'tiktok') {
      // Matches /@handle/video/VIDEOID
      const match = path.match(/\/video\/(\d+)/);
      if (match) return `https://www.tiktok.com/embed/v2/${match[1]}`;
    }

    if (platform === 'x') {
      // Matches /user/status/TWEETID
      const match = path.match(/\/status\/(\d+)/);
      if (match) return `https://platform.twitter.com/embed/Tweet.html?id=${match[1]}&theme=dark&chrome=nofooter`;
    }

    if (platform === 'threads') {
      // Threads post: /username/post/SHORTCODE → official embed
      const match = path.match(/\/([^/]+)\/post\/([A-Za-z0-9_-]+)/);
      if (match) return `https://www.threads.net/${match[1]}/post/${match[2]}/embed`;
    }
  } catch {
    // invalid URL
  }
  return null;
}

const EMBED_HEIGHTS: Record<Platform, number> = {
  instagram: 540,
  tiktok:    740,
  x:         300,
  threads:   380,
  unknown:   400,
};

// ─── Embed box ────────────────────────────────────────────────────────────────

function NativeEmbed({ platform, sourceUrl }: { platform: Platform; sourceUrl: string }) {
  const [open, setOpen] = useState(false);
  const embedUrl = getEmbedUrl(platform, sourceUrl);
  if (!embedUrl) return null;

  const height = EMBED_HEIGHTS[platform];
  const cfg = PLATFORM_CONFIG[platform];

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cfg.borderColor}`, background: cfg.color }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/5"
        style={{ color: cfg.textColor }}
      >
        <span>View on {cfg.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="w-full overflow-hidden" style={{ height }}>
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

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
      style={{
        background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
        color: copied ? '#4ade80' : 'var(--text-muted)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

// ─── Text field block ─────────────────────────────────────────────────────────

function TextField({ label, text, accentColor }: { label: string; text: string; accentColor?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accentColor || 'var(--text-muted)' }}>
          {label}
        </span>
        <CopyButton text={text} label="Copy" />
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {text}
      </p>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface PostReferenceCardProps {
  ref_: PostReference;
  onDelete: (id: string) => void;
}

export default function PostReferenceCard({ ref_, onDelete }: PostReferenceCardProps) {
  const cfg  = PLATFORM_CONFIG[ref_.sourcePlatform];
  const rtg  = ref_.performanceRating ? RATING[ref_.performanceRating] : null;
  const hasEmbed = !!ref_.sourceUrl && getEmbedUrl(ref_.sourcePlatform, ref_.sourceUrl) !== null;

  return (
    <div
      className="card group flex flex-col gap-3 p-4 transition-all hover:border-white/10"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Platform badge */}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cfg.color, color: cfg.textColor, border: `1px solid ${cfg.borderColor}` }}
          >
            {cfg.label}
          </span>

          {/* Performance stars */}
          {rtg && (
            <span className="text-xs font-medium" style={{ color: rtg.color }}>
              {'★'.repeat(rtg.stars)}{'☆'.repeat(3 - rtg.stars)}
            </span>
          )}

          {/* Tags */}
          {ref_.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {ref_.sourceUrl && (
            <a
              href={ref_.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon"
              title="Open original"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={() => onDelete(ref_.id)} className="btn-icon hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Cover image (if no embed, show thumbnail) ── */}
      {ref_.coverImageUrl && !hasEmbed && (
        <div className="rounded-xl overflow-hidden" style={{ maxHeight: 240 }}>
          <img
            src={ref_.coverImageUrl}
            alt="Post cover"
            className="w-full object-cover"
            style={{ maxHeight: 240 }}
          />
        </div>
      )}

      {/* ── Native embed ── */}
      {hasEmbed && ref_.sourceUrl && (
        <NativeEmbed platform={ref_.sourcePlatform} sourceUrl={ref_.sourceUrl} />
      )}

      {/* ── Text fields ── */}
      <div className="space-y-3 pt-0.5">
        {ref_.caption && (
          <TextField label="Hook / Opening line" text={ref_.caption} accentColor="#A78BFA" />
        )}

        {ref_.description && (
          <TextField
            label="Post Caption"
            text={ref_.description}
            accentColor={cfg.textColor}
          />
        )}

        {ref_.imageCaption && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: '#FCD34D' }}>
                <Type className="w-3 h-3" />
                Image Text Overlay
              </span>
              <CopyButton text={ref_.imageCaption} label="Copy" />
            </div>
            <div
              className="rounded-lg px-3 py-2 text-xs font-medium leading-relaxed"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#FDE68A' }}
            >
              {ref_.imageCaption}
            </div>
          </div>
        )}

        {!ref_.caption && !ref_.description && !ref_.imageCaption && (
          <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No text extracted</p>
        )}
      </div>
    </div>
  );
}
