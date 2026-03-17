'use client';

import { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DiscordLogo } from '@/components/DiscordLogo';

export default function SplashPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Redirect based on approval status if already signed in
    if (status === 'authenticated' && session) {
      if (session.user.approvalStatus === 'pending') {
        router.push('/auth/pending');
      } else if (session.user.approvalStatus === 'denied') {
        router.push('/auth/denied');
      } else {
        // Approved or admin - go to main app
        router.push('/');
      }
    }
  }, [session, status, router]);

  const handleSignIn = () => {
    signIn('discord', { callbackUrl: '/auth/splash' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="text-center p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent mb-2">
            Social Scheduler
          </h1>
          <p className="text-zinc-400 text-sm">
            Content management for OnlyFans creators
          </p>
        </div>

        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-2xl p-8 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-white mb-2">
            Sign in to continue
          </h2>
          <p className="text-zinc-400 text-sm mb-6">
            Use your Discord account to access the platform
          </p>

          <button
            onClick={handleSignIn}
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DiscordLogo size={24} className="text-white" />
            Continue with Discord
          </button>

          <div className="mt-6 pt-6 border-t border-zinc-700">
            <p className="text-zinc-500 text-xs">
              New users will require approval from an admin before accessing the platform.
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-zinc-500 text-xs">
          <span>Instagram</span>
          <span>•</span>
          <span>TikTok</span>
          <span>•</span>
          <span>X</span>
          <span>•</span>
          <span>Threads</span>
          <span>•</span>
          <span>Fanvue</span>
        </div>
      </div>
    </div>
  );
}
