import { LoginForm } from '@/features/auth/login-form';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);

  return (
    <main className="tm-app-shell">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-stone-100">
        <p className="tm-display-eyebrow">Mission Access</p>
        <h1 className="tm-display-title text-3xl font-bold">Join Your Group</h1>
        <p className="tm-body-copy text-sm">
          Sign in with your registered email and 6-digit PIN, or create a confirmed account with your full name and username.
        </p>
        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
