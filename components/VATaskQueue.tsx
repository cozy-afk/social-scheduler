'use client';

import { useStore } from '@/lib/store';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { Download, CheckCircle, Play } from 'lucide-react';
import { Post, Platform } from '@/types/models';
import clsx from 'clsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const POST_TYPE_SHORT: Partial<Record<string, string>> = {
  instagram_post:   'IG Post',
  instagram_reel:   'IG Reel',
  instagram_story:  'IG Story',
  tiktok_reel:      'TT Reel',
  tiktok_slideshow: 'TT Slideshow',
  tiktok_story:     'TT Story',
  x_post:           'X Post',
  threads_post:     'Threads Post',
  fanvue_post:      'Fanvue Post',
};

const PLATFORM_BADGE_CLASSES: Record<Platform, string> = {
  instagram: 'bg-pink-500/90 text-white',
  tiktok:    'bg-red-500/90 text-white',
  threads:   'bg-purple-500/90 text-white',
  x:         'bg-slate-500/90 text-white',
  fanvue:    'bg-orange-500/90 text-white',
};

const PLATFORM_GRADIENT: Record<Platform, string> = {
  instagram: 'from-pink-600/40 to-pink-900/40',
  tiktok:    'from-red-600/40 to-red-900/40',
  threads:   'from-purple-600/40 to-purple-900/40',
  x:         'from-slate-500/40 to-slate-800/40',
  fanvue:    'from-orange-600/40 to-orange-900/40',
};

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok:    'TikTok',
  threads:   'Threads',
  x:         'X',
  fanvue:    'Fanvue',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ThumbnailProps {
  post: Post;
}

function CardThumbnail({ post }: ThumbnailProps) {
  const asset = post.assets[0];
  const isVideo = asset?.fileType === 'video';
  const hasUrl = typeof asset?.fileUrl === 'string' && asset.fileUrl.startsWith('http');
  const gradient = PLATFORM_GRADIENT[post.platform];

  if (!asset || !hasUrl) {
    return (
      <div className={clsx('w-full h-full bg-gradient-to-br', gradient, 'flex items-center justify-center')}>
        <span className="text-3xl opacity-60">
          {post.platform === 'instagram' ? '📸' : post.platform === 'tiktok' ? '🎵' : post.platform === 'threads' ? '🧵' : post.platform === 'fanvue' ? '🎭' : '𝕏'}
        </span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
        <Play className="w-10 h-10 text-white/80" />
      </div>
    );
  }

  return (
    <img
      src={asset.fileUrl}
      alt=""
      className="w-full h-full object-cover"
    />
  );
}

interface ApprovalBadgeProps {
  status: Post['approvalStatus'];
}

function ApprovalBadge({ status }: ApprovalBadgeProps) {
  if (!status) return null;

  const classes = {
    approved: 'bg-green-500/20 text-green-300 border border-green-500/30',
    pending:  'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    rejected: 'bg-red-500/20 text-red-300 border border-red-500/30',
  }[status];

  const labels = {
    approved: 'Approved',
    pending:  'Pending Review',
    rejected: 'Rejected',
  }[status];

  return (
    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', classes)}>
      {labels}
    </span>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  post: Post;
  onDownloadAsset: (post: Post, assetIndex?: number) => void;
  onMarkAsPosted: (postId: string) => void;
}

function TaskCard({ post, onDownloadAsset, onMarkAsPosted }: TaskCardProps) {
  const scheduledDate = new Date(post.scheduledTime);
  const scheduledLabel = format(scheduledDate, 'MMM d · h:mm a');
  const isVideo = post.assets[0]?.fileType === 'video';
  const captionPreview = post.description
    ? post.description.length > 120
      ? post.description.slice(0, 120) + '…'
      : post.description
    : null;

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Thumbnail — ~40% of card height */}
      <div className="relative w-full" style={{ paddingBottom: '42%' }}>
        <div className="absolute inset-0">
          <CardThumbnail post={post} />
        </div>

        {/* Platform badge — top-right */}
        <span
          className={clsx(
            'absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full',
            PLATFORM_BADGE_CLASSES[post.platform]
          )}
        >
          {PLATFORM_LABEL[post.platform]}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2.5 p-3 flex-1">
        {/* Post type + scheduled time row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-200">
            {POST_TYPE_SHORT[post.postType] ?? post.postType}
          </span>
          <span className="text-[11px] text-slate-400">{scheduledLabel}</span>
        </div>

        {/* Approval status */}
        {post.approvalStatus && (
          <div>
            <ApprovalBadge status={post.approvalStatus} />
          </div>
        )}

        {/* Caption preview */}
        {captionPreview && (
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{captionPreview}</p>
        )}

        {/* Image caption overlay note */}
        {post.imageCaption && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-2.5 py-1.5">
            <p className="text-[10px] text-blue-400 font-medium mb-0.5">Image caption overlay</p>
            <p className="text-xs text-blue-200 truncate">"{post.imageCaption}"</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-1.5 mt-auto pt-1">
          {post.assets.length === 1 ? (
            <button
              onClick={() => onDownloadAsset(post)}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download {isVideo ? 'Video' : 'Image'}
            </button>
          ) : (
            <div className="space-y-1">
              {post.assets.map((asset, idx) => (
                <button
                  key={asset.id}
                  onClick={() => onDownloadAsset(post, idx)}
                  className="btn-ghost w-full flex items-center gap-2 justify-center text-xs py-1.5"
                >
                  <Download className="w-3 h-3" />
                  {isVideo ? 'Video' : 'Image'} {asset.order}
                </button>
              ))}
              <button
                onClick={() => onDownloadAsset(post)}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download All ({post.assets.length})
              </button>
            </div>
          )}

          <button
            onClick={() => onMarkAsPosted(post.id)}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-150 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            Mark as Posted
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignedPosts.map((post) => (
          <TaskCard
            key={post.id}
            post={post}
            onDownloadAsset={handleDownloadAsset}
            onMarkAsPosted={handleMarkAsPosted}
          />
        ))}
      </div>
    </div>
  );
}
