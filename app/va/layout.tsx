import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'CreatorFlow VA',
  description: 'Your daily posting task queue',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VA Queue',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090B',
};

// Full-screen overlay — covers the desktop sidebar entirely
export default function VALayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: '#09090B',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {children}
    </div>
  );
}
