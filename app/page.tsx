'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockPosts, mockCaptions, mockVAUsers } from '@/lib/mockData';
import CalendarView from '@/components/CalendarView';
import CreatePostModal from '@/components/CreatePostModal';
import { AuthGuard } from '@/components/AuthGuard';

export default function AdminPage() {
  const { setModels, setSelectedModelId, setCurrentUser, setPosts, setCaptions, setVAUsers, showCreatePostModal } = useStore();

  useEffect(() => {
    setModels(mockModels);
    setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setPosts(mockPosts);
    setCaptions(mockCaptions);
    setVAUsers(mockVAUsers);
  }, [setModels, setSelectedModelId, setCurrentUser, setPosts, setCaptions, setVAUsers]);

  return (
    <AuthGuard>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <CalendarView />
        </div>
        {showCreatePostModal && <CreatePostModal />}
      </div>
    </AuthGuard>
  );
}
