'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockPosts, mockCaptions } from '@/lib/mockData';
import AppHeader from '@/components/AppHeader';
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
    <div className="min-h-screen bg-slate-950">
      <AppHeader activePage="gallery" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <StoryApprovalQueue />
      </main>
    </div>
  );
}
