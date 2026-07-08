import { ResetPinForm } from '@/features/auth/reset-pin-form';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';

export default async function ResetPinPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);

  return (
    <main className="tm-app-shell">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-stone-100">
        <p className="tm-display-eyebrow">Mission Recovery</p>
        <h1 className="tm-display-title text-3xl font-bold">Set A New PIN</h1>
        <p className="tm-body-copy text-sm">
          Choose and confirm a new 6-digit PIN for your Terraforming Mars
          Stats account.
        </p>
        <ResetPinForm nextPath={nextPath} />
      </section>
    </main>
  );
}
