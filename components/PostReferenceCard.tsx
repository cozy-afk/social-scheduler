'use client';

import { useState } from 'react';
import { Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { PostReference } from '@/types/models';

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<
  PostReference['sourcePlatform'],
  { label: string; icon: string; badge: string }
> = {
  instagram: {
    label: 'Instagram',
    icon: '📸',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
  tiktok: {
    label: 'TikTok',
    icon: '🎵',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  threads: {
    label: 'Threads',
    icon: '🧵',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  x: {
    label: 'X',
    icon: '𝕏',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
  unknown: {
    label: 'Unknown',
    icon: '🔗',
    badge: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  },
};

const RATING_STARS: Record<'high' | 'medium' | 'low', { filled: number; color: string }> = {
  high:   { filled: 3, color: 'text-green-400' },
  medium: { filled: 2, color: 'text-yellow-400' },
  low:    { filled: 1, color: 'text-slate-400' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PostReferenceCardProps {
  ref_: PostReference;
  onDelete: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PostReferenceCard({ ref_, onDelete }: PostReferenceCardProps) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);

  const platform = PLATFORM_CONFIG[ref_.sourcePlatform];

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(ref_.caption).catch(() => {});
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(ref_.description).catch(() => {});
    setCopiedDescription(true);
    setTimeout(() => setCopiedDescription(false), 2000);
  };

  const ratingCfg = ref_.performanceRating ? RATING_STARS[ref_.performanceRating] : null;

  return (
    <div className="card p-3 group hover:border-slate-600 transition-colors relative">
      {/* Action buttons — visible on group-hover */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={handleCopyCaption}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors text-[10px] flex items-center gap-1"
          title="Copy Caption"
        >
          {copiedCaption ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Caption</span>
        </button>
        <button
          onClick={handleCopyDescription}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors text-[10px] flex items-center gap-1"
          title="Copy Description"
        >
          {copiedDescription ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Desc</span>
        </button>
        <button
          onClick={() => onDelete(ref_.id)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-3">
        {/* Thumbnail / placeholder */}
        <div className="flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center">
          {ref_.coverImageUrl ? (
            <img
              src={ref_.coverImageUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl select-none" aria-hidden="true">
              {platform.icon}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 pr-16 sm:pr-20">
          {/* Caption */}
          <p className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">
            {ref_.caption || <span className="italic text-slate-500">No caption</span>}
          </p>

          {/* Description */}
          {ref_.description && (
            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
              {ref_.description}
            </p>
          )}

          {/* Bottom row: platform badge, stars, tags, source */}
          <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
            {/* Platform badge */}
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                platform.badge
              )}
            >
              {platform.icon} {platform.label}
            </span>

            {/* Performance stars */}
            {ratingCfg && (
              <span className={clsx('text-xs', ratingCfg.color)}>
                {'★'.repeat(ratingCfg.filled)}{'☆'.repeat(3 - ratingCfg.filled)}
              </span>
            )}

            {/* Tags — first 2 */}
            {ref_.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700"
              >
                #{tag}
              </span>
            ))}

            {/* Source link */}
            {ref_.sourceUrl && (
              <a
                href={ref_.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors ml-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                Source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
