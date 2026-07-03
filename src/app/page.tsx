import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#4f1d12,_#0c0f14_55%)] text-stone-100">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
        <p className="text-xs uppercase tracking-[0.35em] text-orange-300">
          Shared Terraforming Mars tracker
        </p>
        <h1 className="font-serif text-4xl font-bold tracking-wide text-stone-50">
          Terraforming Mars Stats
        </h1>
        <p className="text-sm leading-6 text-stone-200/85">
          Log finished games, compare corporations and preludes, and see how your
          group&apos;s meta changes over time.
        </p>
        <Link
          className="rounded-full bg-orange-400 px-5 py-3 text-center text-sm font-semibold text-slate-950"
          href="/login"
        >
          Sign in to your group
        </Link>
      </section>
    </main>
  );
}
