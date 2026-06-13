import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'gegarap.id — Jasa Tukang Terpercaya di Yogyakarta',
    template: '%s · gegarap.id',
  },
  description:
    'Temukan tukang ledeng, listrik, dan kebersihan profesional & terverifikasi di sekitar Anda. Booking mudah, pembayaran aman via DP.',
  keywords: ['jasa tukang', 'tukang ledeng', 'tukang listrik', 'Yogyakarta', 'gegarap'],
  metadataBase: new URL('https://gegarap.id'),
  openGraph: {
    title: 'gegarap.id — Jasa Tukang Terpercaya di Yogyakarta',
    description: 'Tukang terverifikasi di sekitar Anda. Cepat, aman, terpercaya.',
    locale: 'id_ID',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <ToastProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
