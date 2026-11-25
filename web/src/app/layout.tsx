import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';

const figtree = Figtree({ variable: '--font-figtree', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: { default: 'Trucks2U', template: '%s · Trucks2U' },
  description: 'Dump trucks on demand',
  appleWebApp: { capable: true, title: 'Trucks2U', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#ffffff' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
