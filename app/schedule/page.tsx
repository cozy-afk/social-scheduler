'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { mockModels, mockAdmin } from '@/lib/mockData';
import { AuthGuard } from '@/components/AuthGuard';
import BatchScheduler from '@/components/BatchScheduler';

export default function SchedulePage() {
  const { models, currentUser, setModels, setCurrentUser } = useStore();

  useEffect(() => {
    if (models.length === 0) setModels(mockModels);
    if (!currentUser) setCurrentUser(mockAdmin);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthGuard>
      <div className="h-full">
        <BatchScheduler />
      </div>
    </AuthGuard>
  );
}
