import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="tm-app-shell">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
        <p className="tm-display-eyebrow">
          Shared Terraforming Mars tracker
        </p>
        <h1 className="tm-display-title text-4xl font-bold">
          Terraforming Mars Stats
        </h1>
        <p className="tm-body-copy text-sm">
          Log finished games, compare corporations and preludes, and see how your
          group&apos;s meta changes over time.
        </p>
        <Link
          className="tm-button-primary"
          href="/login"
        >
          Sign in to your group
        </Link>
      </section>
    </main>
  );
}
