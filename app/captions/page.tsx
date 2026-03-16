'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockCaptions } from '@/lib/mockData';
import AppHeader from '@/components/AppHeader';
import { Caption, CaptionCategory } from '@/types/models';
import { Plus, Star, Trash2, Copy, Check, ChevronDown } from 'lucide-react';

const CATEGORY_CONFIG: Record<CaptionCategory, { label: string; icon: string; description: string; color: string }> = {
  ig_reels: {
    label: 'IG Reels',
    icon: '🎬',
    description: 'Short, engaging captions for Instagram Reels',
    color: 'border-pink-500/40 bg-pink-500/10',
  },
  ig_post: {
    label: 'IG Post',
    icon: '📸',
    description: 'Carousel and single image post descriptions',
    color: 'border-pink-400/40 bg-pink-400/10',
  },
  tiktok_slideshow: {
    label: 'TikTok Slideshow',
    icon: '🖼️',
    description: 'Text that goes directly ON each slide image',
    color: 'border-red-500/40 bg-red-500/10',
  },
  tiktok_reel: {
    label: 'TikTok Reels',
    icon: '🎵',
    description: 'Short captions for TikTok video posts',
    color: 'border-red-400/40 bg-red-400/10',
  },
  threads_post: {
    label: 'Threads',
    icon: '🧵',
    description: 'Conversational post text for Threads',
    color: 'border-purple-500/40 bg-purple-500/10',
  },
  x_post: {
    label: 'X (Twitter)',
    icon: '𝕏',
    description: 'Promotional tweets and post text',
    color: 'border-slate-500/40 bg-slate-500/10',
  },
  general: {
    label: 'General',
    icon: '✨',
    description: 'Multi-platform captions',
    color: 'border-blue-500/40 bg-blue-500/10',
  },
};

const RATING_CONFIG = {
  high:   { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', stars: 3 },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', stars: 2 },
  low:    { color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/30', stars: 1 },
};

function CaptionCard({
  caption,
  onCopy,
  onDelete,
  copiedId,
}: {
  caption: Caption;
  onCopy: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  copiedId: string | null;
}) {
  const rating = caption.performanceRating ? RATING_CONFIG[caption.performanceRating] : null;
  const isCopied = copiedId === caption.id;

  return (
    <div className="card p-4 group hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-slate-100 text-sm leading-relaxed flex-1">{caption.text}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onCopy(caption.id, caption.text)}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
            title="Copy"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDelete(caption.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {rating && (
          <span className={`platform-chip border ${rating.bg} ${rating.color} gap-0.5`}>
            {'★'.repeat(rating.stars)}{'☆'.repeat(3 - rating.stars)}
          </span>
        )}
        {caption.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="platform-chip bg-slate-800 text-slate-400 border border-slate-700">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function AddCaptionForm({
  category,
  onAdd,
  onClose,
}: {
  category: CaptionCategory;
  onAdd: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [rating, setRating] = useState<'high' | 'medium' | 'low'>('high');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="card-surface p-4 space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter caption text..."
        rows={3}
        autoFocus
        className="input-dark resize-none text-sm"
      />
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value as 'high' | 'medium' | 'low')}
            className="input-dark py-2 pr-8 appearance-none text-sm cursor-pointer"
          >
            <option value="high">★★★ High performer</option>
            <option value="medium">★★☆ Medium</option>
            <option value="low">★☆☆ Low</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <button type="button" onClick={onClose} className="btn-secondary text-sm px-3 py-2">
          Cancel
        </button>
        <button type="submit" className="btn-primary text-sm px-3 py-2">
          Add
        </button>
      </div>
    </form>
  );
}

export default function CaptionsPage() {
  const { setModels, setSelectedModelId, setCurrentUser, captions, setCaptions, addCaption } = useStore();
  const [activeCategory, setActiveCategory] = useState<CaptionCategory>('ig_reels');
  const [addingToCategory, setAddingToCategory] = useState<CaptionCategory | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setCaptions(mockCaptions);
  }, [setModels, setSelectedModelId, setCurrentUser, setCaptions]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    setDeletedIds((prev) => new Set([...prev, id]));
  };

  const handleAdd = (category: CaptionCategory, text: string) => {
    const catConfig = CATEGORY_CONFIG[category];
    // Map category to platform + postType
    const platformMap: Record<CaptionCategory, { platform: Caption['platform']; postType: Caption['postType'] }> = {
      ig_reels:        { platform: 'instagram', postType: 'instagram_reel' },
      ig_post:         { platform: 'instagram', postType: 'instagram_post' },
      tiktok_slideshow:{ platform: 'tiktok',    postType: 'tiktok_slideshow' },
      tiktok_reel:     { platform: 'tiktok',    postType: 'tiktok_reel' },
      threads_post:    { platform: 'threads',   postType: 'threads_post' },
      x_post:          { platform: 'x',         postType: 'x_post' },
      general:         { platform: 'instagram', postType: 'instagram_post' },
    };
    addCaption({
      id: `cap-custom-${Date.now()}`,
      category,
      ...platformMap[category],
      text,
      performanceRating: 'high',
      tags: [],
      createdAt: new Date().toISOString(),
    });
    setAddingToCategory(null);
  };

  const visibleCaptions = captions.filter(
    (c) => c.category === activeCategory && !deletedIds.has(c.id)
  );

  const categoryCounts = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
    acc[cat as CaptionCategory] = captions.filter(
      (c) => c.category === cat && !deletedIds.has(c.id)
    ).length;
    return acc;
  }, {} as Record<CaptionCategory, number>);

  return (
    <div className="min-h-screen bg-slate-950">
      <AppHeader activePage="captions" />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Caption Library</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your high-performing captions by category
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
          {(Object.entries(CATEGORY_CONFIG) as [CaptionCategory, typeof CATEGORY_CONFIG[CaptionCategory]][]).map(
            ([cat, cfg]) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
                  activeCategory === cat
                    ? `${cfg.color} text-slate-100`
                    : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeCategory === cat ? 'bg-white/20' : 'bg-slate-700 text-slate-400'}`}>
                  {categoryCounts[cat]}
                </span>
              </button>
            )
          )}
        </div>

        {/* Active Category Header */}
        <div className={`rounded-xl border p-4 mb-4 ${CATEGORY_CONFIG[activeCategory].color}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{CATEGORY_CONFIG[activeCategory].icon}</span>
              <div>
                <h3 className="font-semibold text-white">{CATEGORY_CONFIG[activeCategory].label}</h3>
                <p className="text-xs text-slate-400">{CATEGORY_CONFIG[activeCategory].description}</p>
              </div>
            </div>
            <button
              onClick={() => setAddingToCategory(activeCategory)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Caption
            </button>
          </div>
        </div>

        {/* Add form */}
        {addingToCategory === activeCategory && (
          <div className="mb-4">
            <AddCaptionForm
              category={activeCategory}
              onAdd={(text) => handleAdd(activeCategory, text)}
              onClose={() => setAddingToCategory(null)}
            />
          </div>
        )}

        {/* Caption Cards */}
        {visibleCaptions.length === 0 ? (
          <div className="card py-14 flex flex-col items-center text-center">
            <Star className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-slate-400 font-medium">No captions yet</p>
            <p className="text-slate-600 text-sm mt-1">Add your first caption for this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleCaptions.map((caption) => (
              <CaptionCard
                key={caption.id}
                caption={caption}
                onCopy={handleCopy}
                onDelete={handleDelete}
                copiedId={copiedId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
