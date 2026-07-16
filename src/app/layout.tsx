import type { Metadata } from 'next';
import { RecoveryHashRedirect } from '@/features/auth/recovery-hash-redirect';
import './globals.css';

export const metadata: Metadata = {
  title: 'Terraforming Mars Stats',
  description: 'Track Terraforming Mars games, scores, and analytics.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RecoveryHashRedirect />
        {children}
      </body>
    </html>
  );
}
