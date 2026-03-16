'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockPosts, mockCaptions, mockVAUsers } from '@/lib/mockData';
import AppHeader from '@/components/AppHeader';
import CalendarView from '@/components/CalendarView';
import CreatePostModal from '@/components/CreatePostModal';

export default function AdminPage() {
  const { setModels, setSelectedModelId, setCurrentUser, setPosts, setCaptions, setVAUsers } = useStore();

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setPosts(mockPosts);
    setCaptions(mockCaptions);
    setVAUsers(mockVAUsers);
  }, [setModels, setSelectedModelId, setCurrentUser, setPosts, setCaptions, setVAUsers]);

  return (
    <div className="min-h-screen bg-slate-950">
      <AppHeader activePage="calendar" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CalendarView />
      </main>
      <CreatePostModal />
    </div>
  );
}
