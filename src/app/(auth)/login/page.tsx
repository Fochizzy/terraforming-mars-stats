import { LoginForm } from '@/features/auth/login-form';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';
import { resolveStaticSiteAsset } from '@/lib/assets';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);
  const background = resolveStaticSiteAsset('auth-page-mars-landscape');

  return (
    <main
      className="tm-app-shell tm-login-shell"
      style={{
        backgroundColor: '#080b10',
        backgroundImage:
          `linear-gradient(90deg, rgba(5, 7, 10, 0.82) 0%, rgba(7, 9, 12, 0.65) 46%, rgba(7, 9, 12, 0.38) 100%), linear-gradient(180deg, rgba(5, 7, 10, 0.18) 0%, rgba(5, 7, 10, 0.72) 100%), url('${background.url}')`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-stone-100">
        <p className="tm-display-eyebrow">Mission Access</p>
        <h1 className="tm-display-title text-3xl font-bold">Join Your Group</h1>
        <p className="tm-body-copy text-sm">
          Sign in with your username or email and 6-digit PIN, or create an
          account with your full name and recovery email.
        </p>
        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
