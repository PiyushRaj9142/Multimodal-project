import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Multimodal Attendance & Engagement Agent',
  description: 'Privacy-Preserving Classroom Intelligence, Presence Tracking, and Multimodal Engagement Telemetry',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col">
        <Suspense fallback={<header className="h-16 border-b border-slate-200 bg-white" />}>
          <Navbar />
        </Suspense>
        <div className="flex flex-1 overflow-hidden">
          <Suspense fallback={<aside className="w-64 border-r border-slate-200 bg-white" />}>
            <Sidebar />
          </Suspense>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading view...</div>}>
                {children}
              </Suspense>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
