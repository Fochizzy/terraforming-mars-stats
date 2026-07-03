import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const hasSupabaseAuthCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-'));

  if (!hasSupabaseAuthCookie) {
    redirect('/login');
  }

  return children;
}
