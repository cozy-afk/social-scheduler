'use client';

import { useStore } from '@/lib/store';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { Download, CheckCircle, Film, Image as ImageIcon } from 'lucide-react';
import { Post } from '@/types/models';

const POST_TYPE_DISPLAY: Partial<Record<string, string>> = {
  instagram_post:    'Instagram Post (Carousel)',
  instagram_reel:    'Instagram Reel',
  instagram_story:   'Instagram Story',
  tiktok_reel:       'TikTok Reel',
  tiktok_slideshow:  'TikTok Slideshow',
  tiktok_story:      'TikTok Story',
  x_post:            'X Post',
  threads_post:      'Threads Post',
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  tiktok:    'bg-red-500/20 text-red-300 border-red-500/30',
  x:         'bg-slate-500/20 text-slate-300 border-slate-500/30',
  threads:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

export default function VATaskQueue() {
  const { models, selectedModelId, posts, currentUser, updatePost } = useStore();

  const selectedModel = models.find((m) => m.id === selectedModelId);

  const assignedPosts = useMemo(() => {
    if (!selectedModel || !currentUser) return [];
    return posts
      .filter(
        (p) =>
          p.modelId === selectedModel.id &&
          p.status === 'scheduled' &&
          (!p.assignedVaId || p.assignedVaId === currentUser.id)
      )
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }, [selectedModel, posts, currentUser]);

  const handleDownloadAsset = (post: Post, assetIndex?: number) => {
    const assets = assetIndex !== undefined ? [post.assets[assetIndex]] : post.assets;
    assets.forEach((asset) => {
      const time = format(new Date(post.scheduledTime), 'HHmm');
      const date = format(new Date(post.scheduledTime), 'MMdd');
      let filename = '';
      if (post.postType === 'instagram_post') filename = `Instagram_Post_${date}_${time}_${asset.order}of${post.assets.length}.jpg`;
      else if (post.postType === 'instagram_reel') filename = `Instagram_Reel_${date}_${time}.mp4`;
      else if (post.postType === 'tiktok_reel') filename = `TikTok_Reel_${date}_${time}.mp4`;
      else if (post.postType === 'tiktok_slideshow') filename = `TikTok_Slide_${date}_${time}_${asset.order}of${post.assets.length}.jpg`;
      else if (post.postType === 'x_post') filename = `X_Post_${date}_${time}_${asset.order}.jpg`;
      else if (post.postType === 'threads_post') filename = `Threads_Post_${date}_${time}_${asset.order}.jpg`;
      console.log(`Downloading: ${filename}`);
      alert(`Would download: ${filename}\nWith EXIF metadata spoofed to ${selectedModel?.exifPreset.device}`);
    });
  };

  const handleMarkAsPosted = (postId: string) => {
    updatePost(postId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: currentUser?.id,
    });
  };

  if (!selectedModel) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>Please select a model to view tasks</p>
      </div>
    );
  }

  if (assignedPosts.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="w-12 h-12 text-green-500/50 mb-3" />
        <p className="text-slate-300 font-medium">All caught up!</p>
        <p className="text-slate-500 text-sm mt-1">No pending posts for {selectedModel.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {selectedModel.profileImage} {selectedModel.name}
        </h2>
        <span className="text-sm text-slate-400">
          {assignedPosts.length} post{assignedPosts.length !== 1 ? 's' : ''} pending
        </span>
      </div>

      {assignedPosts.map((post) => {
        const scheduledDate = new Date(post.scheduledTime);
        const isToday = format(scheduledDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        const timeLabel = isToday ? 'Today' : format(scheduledDate, 'MMM d');
        const isVideo = post.assets[0]?.fileType === 'video';

        return (
          <div key={post.id} className="card p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`platform-chip border ${PLATFORM_COLORS[post.platform] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                    {post.platform}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {POST_TYPE_DISPLAY[post.postType] || post.postType}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  ⏰ {timeLabel} at {format(scheduledDate, 'h:mm a')}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                {isVideo ? <Film className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                {post.assets.length} {isVideo ? 'video' : `image${post.assets.length > 1 ? 's' : ''}`}
              </div>
            </div>

            {/* Description */}
            {post.description && (
              <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-500 mb-1 font-medium">Description</p>
                <p className="text-sm text-slate-300 italic">"{post.description}"</p>
              </div>
            )}

            {/* Image Caption */}
            {post.imageCaption && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-400 mb-1 font-medium">Image Caption (overlay)</p>
                <p className="text-sm text-blue-200">"{post.imageCaption}"</p>
              </div>
            )}

            {/* Download buttons */}
            <div className="space-y-2">
              {post.assets.length === 1 ? (
                <button
                  onClick={() => handleDownloadAsset(post)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download {isVideo ? 'Video' : 'Image'}
                </button>
              ) : (
                <div className="space-y-1.5">
                  {post.assets.map((asset, idx) => (
                    <button
                      key={asset.id}
                      onClick={() => handleDownloadAsset(post, idx)}
                      className="btn-secondary w-full flex items-center gap-2 justify-center text-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isVideo ? 'Video' : 'Image'} {asset.order}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDownloadAsset(post)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download All ({post.assets.length} files)
                  </button>
                </div>
              )}

              <button
                onClick={() => handleMarkAsPosted(post.id)}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-lg transition-all duration-150 active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Posted
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
