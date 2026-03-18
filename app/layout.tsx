import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CreatorFlow',
  description: 'Multi-platform social media scheduling for creators',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CreatorFlow',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`} style={{ background: '#09090B', color: '#FAFAFA' }}>
        <Providers>
          <div className="app-layout">
            <Sidebar />
            <main className="app-main">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
