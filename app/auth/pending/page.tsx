'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function PendingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/splash' });
  };

  const handleCheckStatus = () => {
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="text-center p-8">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-amber-500 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Account Pending Approval
          </h1>
          <p className="text-zinc-400">
            Your account is awaiting approval from an administrator
          </p>
        </div>

        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-2xl p-6 max-w-md mx-auto">
          <div className="space-y-4 text-left">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Account</p>
              <p className="text-white font-medium">
                {session?.user.email || 'user@example.com'}
              </p>
            </div>

            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Role</p>
              <p className="text-white font-medium capitalize">
                {session?.user.role || 'Agency'}
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-700">
              <p className="text-zinc-400 text-sm">
                An admin will review your account request and assign you to an agency.
                You'll be able to access the platform once your account is approved.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleCheckStatus}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
            >
              Check Status
            </button>

            <button
              onClick={handleSignOut}
              className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
