'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin, mockCaptions, mockVAUsers } from '@/lib/mockData';
import CalendarView from '@/components/CalendarView';
import CreatePostModal from '@/components/CreatePostModal';
import { AuthGuard } from '@/components/AuthGuard';

export default function AdminPage() {
  const { setModels, selectedModelId, setSelectedModelId, setCurrentUser, setCaptions, setVAUsers, showCreatePostModal } = useStore();

  useEffect(() => {
    setModels(mockModels);
    if (!selectedModelId) setSelectedModelId(mockModels[0].id);
    setCurrentUser(mockAdmin);
    setCaptions(mockCaptions);
    setVAUsers(mockVAUsers);
  }, [setModels, setSelectedModelId, setCurrentUser, setCaptions, setVAUsers]);

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
