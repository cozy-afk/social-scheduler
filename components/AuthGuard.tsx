'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { UserRole } from '@/types/models';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requireApproved?: boolean;
  fallback?: ReactNode;
}

export function AuthGuard({
  children,
  requiredRole,
  requireApproved = true,
  fallback,
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    // Redirect to splash if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/splash');
      return;
    }

    if (session?.user) {
      // Redirect to pending if approval required but not approved
      if (requireApproved && session.user.approvalStatus === 'pending') {
        router.push('/auth/pending');
        return;
      }

      // Redirect to denied if approval required but denied
      if (requireApproved && session.user.approvalStatus === 'denied') {
        router.push('/auth/denied');
        return;
      }

      // Check role requirements
      if (requiredRole) {
        const roleHierarchy: Record<UserRole, number> = {
          admin: 4,
          agency: 3,
          planner: 2,
          va: 1,
        };

        if (roleHierarchy[session.user.role] < roleHierarchy[requiredRole]) {
          router.push('/');
          return;
        }
      }
    }
  }, [session, status, router, requiredRole, requireApproved]);

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
      </div>
    );
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show children if authenticated and authorized
  return <>{children}</>;
}
