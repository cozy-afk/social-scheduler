'use client';

import { useSession, signOut } from 'next-auth/react';

export default function DeniedPage() {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/splash' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="text-center p-8">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c.731 0 1.681-1.874 1.948-3.374l-5.458-9.469a2.018 2.018 0 00-1.57-1.07H6.945a2.018 2.018 0 00-1.57 1.07L-1.303 17.376z"
                stroke="currentColor"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Access Denied
          </h1>
          <p className="text-zinc-400">
            Your account request has been denied
          </p>
        </div>

        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-2xl p-6 max-w-md mx-auto">
          <div className="space-y-4">
            <p className="text-zinc-300 text-sm">
              Unfortunately, your account request could not be approved at this time.
              This could be due to:
            </p>

            <ul className="text-left text-zinc-400 text-sm space-y-2 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Incomplete or invalid information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Agency not accepting new members</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Account does not meet requirements</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-zinc-700">
              <p className="text-zinc-400 text-sm">
                If you believe this is an error, please contact your agency administrator.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSignOut}
              className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
