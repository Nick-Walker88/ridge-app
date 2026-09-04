import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ridge — Marathon Training',
  description: 'Marathon training built from your own Garmin history.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-canvas text-text antialiased">{children}</body>
    </html>
  );
}
