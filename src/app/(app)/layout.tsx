import { redirect } from 'next/navigation';
import { isUnauthenticatedAuthError } from '@/lib/supabase/auth-errors';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && !isUnauthenticatedAuthError(error)) {
    throw error;
  }

  if (!user) {
    redirect('/login');
  }

  return children;
}
