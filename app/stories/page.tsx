'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockPosts, mockCaptions } from '@/lib/mockData';
import StoryApprovalQueue from '@/components/StoryApprovalQueue';

export default function StoriesPage() {
  const { setModels, setSelectedModelId, setCurrentUser, setPosts, setCaptions } = useStore();

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setPosts(mockPosts);
    setCaptions(mockCaptions);
  }, [setModels, setSelectedModelId, setCurrentUser, setPosts, setCaptions]);

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-6">
        <StoryApprovalQueue />
      </main>
    </div>
  );
}
