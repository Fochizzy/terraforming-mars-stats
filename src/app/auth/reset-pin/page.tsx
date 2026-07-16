import { redirect } from 'next/navigation';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';
import { ResetPinForm } from '@/features/auth/reset-pin-form';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ResetPinPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login?error=reset_session');
  }

  return (
    <main className="tm-app-shell">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-stone-100">
        <p className="tm-display-eyebrow">Mission Access</p>
        <h1 className="tm-display-title text-3xl font-bold">Set Your New PIN</h1>
        <p className="tm-body-copy text-sm">
          Choose a new 6-digit PIN for this account, then continue back into your
          group.
        </p>
        <ResetPinForm nextPath={nextPath} />
      </section>
    </main>
  );
}
