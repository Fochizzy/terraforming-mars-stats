import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Terraforming Mars Stats',
  description: 'Track Terraforming Mars games, scores, and analytics.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
