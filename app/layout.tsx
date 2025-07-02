import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CryptoTrader Pro - Real-Time Cryptocurrency Dashboard',
  description: 'Professional-grade real-time cryptocurrency trading dashboard with live data integration and advanced analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <DashboardProvider>
          {children}
          <Toaster />
        </DashboardProvider>
      </body>
    </html>
  );
}