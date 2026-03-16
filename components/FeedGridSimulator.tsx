'use client';

import { useState, useEffect } from 'react';
import { Post } from '@/types/models';
import { GripVertical } from 'lucide-react';

interface FeedGridSimulatorProps {
  modelId: string;
  instagramUsername?: string;
  scheduledPosts: Post[];
  onReorder?: (reorderedPosts: Post[]) => void;
}

interface GridPost {
  id: string;
  imageUrl: string;
  isNew: boolean;
  post?: Post;
}

export default function FeedGridSimulator({
  modelId,
  instagramUsername,
  scheduledPosts,
  onReorder,
}: FeedGridSimulatorProps) {
  const [currentGrid, setCurrentGrid] = useState<GridPost[]>([]);
  const [newPosts, setNewPosts] = useState<GridPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (instagramUsername) {
      fetchCurrentFeed(instagramUsername);
    }
  }, [instagramUsername]);

  useEffect(() => {
    // Convert scheduled posts to grid items
    const newGridPosts: GridPost[] = scheduledPosts
      .filter(p => p.platform === 'instagram' && p.postType === 'instagram_post')
      .map(p => ({
        id: p.id,
        imageUrl: p.assets[0]?.fileUrl || '/placeholder.jpg',
        isNew: true,
        post: p,
      }));
    setNewPosts(newGridPosts);
  }, [scheduledPosts]);

  const fetchCurrentFeed = async (username: string) => {
    setLoading(true);
    try {
      // TODO: Implement Instagram API integration
      // For now, mock the current grid
      const mockCurrentFeed: GridPost[] = Array.from({ length: 9 }, (_, i) => ({
        id: `existing-${i}`,
        imageUrl: '/demo-image.jpg',
        isNew: false,
      }));
      setCurrentGrid(mockCurrentFeed);
    } catch (error) {
      console.error('Failed to fetch Instagram feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedPosts = [...newPosts];
    const [draggedItem] = updatedPosts.splice(draggedIndex, 1);
    updatedPosts.splice(index, 0, draggedItem);

    setNewPosts(updatedPosts);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    if (onReorder) {
      const reorderedPosts = newPosts
        .map(gp => gp.post)
        .filter(Boolean) as Post[];
      onReorder(reorderedPosts);
    }
  };

  // Combine current grid with new posts at the top
  const combinedGrid = [...newPosts, ...currentGrid];

  // Calculate aesthetic score (how well the grid flows)
  const calculateAestheticScore = (): number => {
    // TODO: Implement AI-based aesthetic scoring
    // For now, return random score
    return Math.floor(Math.random() * 30) + 70; // 70-100
  };

  const aestheticScore = calculateAestheticScore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Instagram Feed Simulator</h3>
          {instagramUsername && (
            <p className="text-sm text-gray-500">@{instagramUsername}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">{aestheticScore}%</div>
            <div className="text-xs text-gray-500">Feed Score</div>
          </div>
        </div>
      </div>

      {!instagramUsername && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 Add Instagram username in model settings to pull the current grid
          </p>
        </div>
      )}

      {/* Grid Preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-1">
          {combinedGrid.slice(0, 12).map((gridPost, index) => (
            <div
              key={gridPost.id}
              draggable={gridPost.isNew}
              onDragStart={() => gridPost.isNew && handleDragStart(index)}
              onDragOver={(e) => gridPost.isNew && handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative aspect-square bg-gray-100 rounded-sm overflow-hidden ${
                gridPost.isNew ? 'cursor-move' : ''
              } ${draggedIndex === index ? 'opacity-50' : ''}`}
            >
              {/* Image Preview */}
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-4xl">🖼️</div>
              </div>

              {/* New Badge */}
              {gridPost.isNew && (
                <div className="absolute top-1 left-1">
                  <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    New
                  </span>
                </div>
              )}

              {/* Drag Handle */}
              {gridPost.isNew && (
                <div className="absolute top-1 right-1">
                  <GripVertical className="w-4 h-4 text-white drop-shadow" />
                </div>
              )}

              {/* Post Number for New Posts */}
              {gridPost.isNew && (
                <div className="absolute bottom-1 right-1">
                  <span className="bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
                    #{index + 1}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {newPosts.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>{newPosts.length} new post{newPosts.length > 1 ? 's' : ''}</strong> will appear at the top of the feed.
              Drag to reorder for better aesthetics.
            </p>
          </div>
        )}
      </div>

      {/* Grid Analysis */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Color Harmony</div>
          <div className="text-2xl font-semibold text-gray-900">
            {Math.floor(Math.random() * 20) + 75}%
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Content Balance</div>
          <div className="text-2xl font-semibold text-gray-900">
            {Math.floor(Math.random() * 15) + 80}%
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Visual Flow</div>
          <div className="text-2xl font-semibold text-gray-900">
            {Math.floor(Math.random() * 25) + 70}%
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-purple-900 mb-2">✨ AI Suggestions</h4>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>• Try alternating darker and lighter posts for better contrast</li>
          <li>• Current post #{1} would work better in position #3</li>
          <li>• Consider the "rule of thirds" pattern for maximum engagement</li>
        </ul>
      </div>
    </div>
  );
}
