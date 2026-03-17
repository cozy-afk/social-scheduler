'use client';

import { useState, useCallback } from 'react';
import { Post } from '@/types/models';
import { X, GripVertical, BarChart2 } from 'lucide-react';
import { POST_TYPE_CONFIGS, getPostTypeColor } from '@/lib/constants/platform';

interface FeedPreviewModalProps {
  modelId: string;
  modelName: string;
  scheduledPosts: Post[];
  onClose: () => void;
}

const PLATFORM_TABS = [
  { id: 'instagram', label: 'Instagram Grid', icon: '📸' },
  { id: 'tiktok', label: 'TikTok Feed', icon: '🎵' },
] as const;

type ActivePlatform = 'instagram' | 'tiktok';

export default function FeedPreviewModal({ modelId, modelName, scheduledPosts, onClose }: FeedPreviewModalProps) {
  const [activePlatform, setActivePlatform] = useState<ActivePlatform>('instagram');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [newPostOrder, setNewPostOrder] = useState<Post[]>(
    scheduledPosts.filter((p) => p.platform === 'instagram' && (p.postType === 'instagram_post' || p.postType === 'instagram_reel'))
  );

  const igScheduled = newPostOrder;
  // 9 placeholder "old" posts (simulating existing feed)
  const OLD_POSTS = 9;

  const handleDragStart = useCallback((idx: number) => setDragIndex(idx), []);
  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === idx) return;
      const reordered = [...newPostOrder];
      const [dragged] = reordered.splice(dragIndex, 1);
      reordered.splice(idx, 0, dragged);
      setNewPostOrder(reordered);
      setDragIndex(idx);
    },
    [dragIndex, newPostOrder]
  );
  const handleDragEnd = useCallback(() => setDragIndex(null), []);

  const tiktokPosts = scheduledPosts.filter((p) => p.platform === 'tiktok');

  // Combined grid: new posts first, then old placeholders
  const igGrid = [
    ...igScheduled.map((p, i) => ({ type: 'new' as const, post: p, idx: i })),
    ...Array.from({ length: OLD_POSTS }, (_, i) => ({ type: 'old' as const, post: null, idx: igScheduled.length + i })),
  ].slice(0, 12);

  const aestheticScore = 72 + igScheduled.length * 3;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Feed Preview</h2>
            <p className="text-xs text-slate-400">Simulate how your feed will look with scheduled posts</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Platform tabs */}
          <div className="flex gap-2">
            {PLATFORM_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePlatform(tab.id as ActivePlatform)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  activePlatform === tab.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {activePlatform === 'instagram' ? (
            <>
              {/* IG Profile Header */}
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xl">👤</div>
                  <div>
                    <p className="font-bold text-white text-sm">@{modelName.toLowerCase().replace(/\s/g, '_')}</p>
                    <p className="text-xs text-slate-400">Instagram Profile</p>
                  </div>
                  <div className="ml-auto flex gap-4 text-center">
                    {[['Posts', '142'], ['Followers', '24.5K'], ['Following', '312']].map(([label, val]) => (
                      <div key={label}>
                        <p className="text-sm font-bold text-white">{val}</p>
                        <p className="text-xs text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aesthetic score */}
              <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-3">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Feed Aesthetic Score</span>
                    <span className="text-sm font-bold text-blue-400">{aestheticScore}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${aestheticScore}%` }} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 text-xs text-blue-300 space-y-1">
                <p>💡 <strong>New posts</strong> appear at the top. Drag them to reorder for better aesthetics.</p>
                <p>🔗 Connect your Instagram account in Model Settings to pull actual feed images.</p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-1">
                {igGrid.map(({ type, post, idx }) => (
                  <div
                    key={idx}
                    draggable={type === 'new'}
                    onDragStart={() => type === 'new' && handleDragStart(idx)}
                    onDragOver={(e) => type === 'new' && handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`relative aspect-square rounded-sm overflow-hidden ${type === 'new' ? 'cursor-move' : ''} ${dragIndex === idx ? 'opacity-40 scale-95' : ''}`}
                  >
                    {type === 'new' && post ? (
                      <div
                        className={`w-full h-full border ${getPostTypeColor(post.postType)} flex flex-col items-center justify-center p-2`}
                      >
                        <span className="text-2xl">{POST_TYPE_CONFIGS[post.postType].icon}</span>
                        <span className="text-[9px] text-center text-slate-300 mt-1 leading-tight">
                          {post.postType.replace('instagram_', '').replace('_', ' ')}
                        </span>
                        <div className="absolute top-1 left-1">
                          <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">NEW</span>
                        </div>
                        <div className="absolute top-1 right-1">
                          <GripVertical className="w-3 h-3 text-white/70" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-slate-800/60 flex items-center justify-center">
                        <span className="text-slate-600 text-xl">🖼️</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {igScheduled.length > 0 && (
                <p className="text-xs text-slate-400 text-center">
                  {igScheduled.length} new post{igScheduled.length !== 1 ? 's' : ''} will appear at the top
                </p>
              )}
            </>
          ) : (
            /* TikTok Feed */
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 text-xs text-blue-300">
                <p>💡 TikTok feed shows videos in chronological order. Connect your account to see actual thumbnails.</p>
              </div>
              {tiktokPosts.length === 0 ? (
                <div className="card py-10 text-center text-slate-500">No TikTok posts scheduled</div>
              ) : (
                tiktokPosts.map((post) => (
                  <div key={post.id} className="flex items-center gap-3 card-surface px-4 py-3 rounded-xl">
                    <div className={`w-12 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${getPostTypeColor(post.postType)}`}>
                      <span className="text-xl">{POST_TYPE_CONFIGS[post.postType].icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 capitalize">{post.postType.replace('tiktok_', '').replace('_', ' ')}</p>
                      <p className="text-xs text-slate-400 truncate">{post.description}</p>
                    </div>
                    <span className="text-[10px] bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full">
                      Scheduled
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
