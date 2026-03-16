'use client';

import { Post } from '@/types/models';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music } from 'lucide-react';

interface PostPreviewProps {
  post: Post;
  modelName: string;
  modelProfileImage?: string;
}

export default function PostPreview({ post, modelName, modelProfileImage }: PostPreviewProps) {
  if (post.platform === 'instagram') {
    return <InstagramPreview post={post} modelName={modelName} modelProfileImage={modelProfileImage} />;
  } else if (post.platform === 'tiktok') {
    return <TikTokPreview post={post} modelName={modelName} modelProfileImage={modelProfileImage} />;
  } else if (post.platform === 'x') {
    return <XPreview post={post} modelName={modelName} modelProfileImage={modelProfileImage} />;
  } else if (post.platform === 'threads') {
    return <ThreadsPreview post={post} modelName={modelName} modelProfileImage={modelProfileImage} />;
  }

  return null;
}

function InstagramPreview({ post, modelName, modelProfileImage }: PostPreviewProps) {
  const isStory = post.postType === 'instagram_story';
  const isReel = post.postType === 'instagram_reel';

  if (isStory) {
    return (
      <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ width: 320, height: 568 }}>
        {/* Story View */}
        <div className="absolute inset-0">
          {/* Progress bars */}
          <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
            <div className="flex-1 h-0.5 bg-white opacity-50 rounded-full" />
          </div>

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 flex items-center gap-2 z-10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm">
              {modelProfileImage || '👤'}
            </div>
            <span className="text-white font-semibold text-sm">{modelName}</span>
            <span className="text-white text-xs opacity-75">2h</span>
          </div>

          {/* Story Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-4xl mb-2">📸</div>
              <p className="text-sm px-4">{post.description}</p>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
            <input
              type="text"
              placeholder="Send message"
              className="flex-1 bg-transparent border border-white border-opacity-50 rounded-full px-4 py-2 text-white text-sm placeholder-white placeholder-opacity-75"
              disabled
            />
            <Heart className="w-6 h-6 text-white ml-3" />
            <Send className="w-6 h-6 text-white ml-3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ width: 375, maxHeight: 667 }}>
      {/* IG Post/Reel */}
      <div className="bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm">
              {modelProfileImage || '👤'}
            </div>
            <span className="font-semibold text-sm">{modelName}</span>
          </div>
          <MoreHorizontal className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className={isReel ? 'aspect-[9/16] bg-black' : 'aspect-square bg-gray-100'}>
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {isReel ? (
              <div className="text-center text-white">
                <div className="text-6xl mb-2">🎬</div>
                <p className="text-sm">Reel Preview</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-2">🖼️</div>
                <p className="text-sm">{post.assets.length} photos</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Heart className="w-6 h-6" />
              <MessageCircle className="w-6 h-6" />
              <Send className="w-6 h-6" />
            </div>
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold mb-1">1,234 likes</div>
          <div className="text-sm">
            <span className="font-semibold mr-1">{modelName}</span>
            {post.description}
          </div>
        </div>
      </div>
    </div>
  );
}

function TikTokPreview({ post, modelName, modelProfileImage }: PostPreviewProps) {
  const isStory = post.postType === 'tiktok_story';

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ width: 320, height: 568 }}>
      {/* TikTok UI */}
      <div className="absolute inset-0">
        {/* Video Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-6xl mb-2">🎵</div>
            <p className="text-sm">TikTok {isStory ? 'Story' : 'Reel'}</p>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 z-10">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-gray-500 border-2 border-white mb-1" />
            <div className="w-4 h-4 bg-red-500 rounded-full -mt-2 border-2 border-black" />
          </div>
          <div className="flex flex-col items-center">
            <Heart className="w-8 h-8 text-white" />
            <span className="text-white text-xs mt-1">42.5K</span>
          </div>
          <div className="flex flex-col items-center">
            <MessageCircle className="w-8 h-8 text-white" />
            <span className="text-white text-xs mt-1">2,345</span>
          </div>
          <div className="flex flex-col items-center">
            <Bookmark className="w-8 h-8 text-white" />
            <span className="text-white text-xs mt-1">891</span>
          </div>
          <div className="flex flex-col items-center">
            <Send className="w-8 h-8 text-white" />
            <span className="text-white text-xs mt-1">Share</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-700 animate-spin-slow flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Bottom Caption */}
        <div className="absolute bottom-0 left-0 right-20 p-4 z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-semibold text-sm">@{modelName.toLowerCase().replace(/\s/g, '')}</span>
          </div>
          <p className="text-white text-sm">{post.description}</p>
          <div className="flex items-center gap-1 mt-2">
            <Music className="w-3 h-3 text-white" />
            <span className="text-white text-xs">Original Audio</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function XPreview({ post, modelName, modelProfileImage }: PostPreviewProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg" style={{ width: 598 }}>
      {/* X/Twitter Post */}
      <div className="p-4">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-xl">
            {modelProfileImage || '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <span className="font-bold text-sm">{modelName}</span>
              <span className="text-gray-500 text-sm">@{modelName.toLowerCase().replace(/\s/g, '')}</span>
              <span className="text-gray-500 text-sm">· 2h</span>
            </div>
            <p className="text-sm mb-3 whitespace-pre-wrap">{post.description}</p>
            
            {post.assets.length > 0 && (
              <div className={`rounded-2xl overflow-hidden border border-gray-200 ${
                post.assets.length === 1 ? 'aspect-video' : 'grid grid-cols-2 gap-0.5'
              }`}>
                {post.assets.slice(0, 4).map((asset, idx) => (
                  <div key={idx} className="bg-gray-100 aspect-square flex items-center justify-center">
                    <div className="text-gray-400 text-4xl">🖼️</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 text-gray-500">
              <div className="flex items-center gap-1 cursor-pointer hover:text-blue-500">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">234</span>
              </div>
              <div className="flex items-center gap-1 cursor-pointer hover:text-green-500">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M7 16V4M17 8v12M3 12h18" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="text-xs">892</span>
              </div>
              <div className="flex items-center gap-1 cursor-pointer hover:text-red-500">
                <Heart className="w-4 h-4" />
                <span className="text-xs">5.2K</span>
              </div>
              <div className="flex items-center gap-1 cursor-pointer hover:text-blue-500">
                <Bookmark className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 cursor-pointer hover:text-blue-500">
                <Send className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadsPreview({ post, modelName, modelProfileImage }: PostPreviewProps) {
  // Threads is very similar to X but with Meta styling
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg" style={{ width: 598 }}>
      <div className="p-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-lg">
            {modelProfileImage || '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm">{modelName.toLowerCase().replace(/\s/g, '')}</span>
                <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-xs">2h</span>
                <MoreHorizontal className="w-4 h-4" />
              </div>
            </div>
            <p className="text-sm mb-3">{post.description}</p>
            
            {post.assets.length > 0 && (
              <div className="rounded-xl overflow-hidden mb-3">
                <div className="bg-gray-100 aspect-square flex items-center justify-center">
                  <div className="text-gray-400 text-5xl">🖼️</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 text-gray-500">
              <Heart className="w-5 h-5 cursor-pointer hover:text-red-500" />
              <MessageCircle className="w-5 h-5 cursor-pointer hover:text-gray-700" />
              <svg className="w-5 h-5 cursor-pointer hover:text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16V4M17 8v12M3 12h18" strokeLinecap="round"/>
              </svg>
              <Send className="w-5 h-5 cursor-pointer hover:text-gray-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
