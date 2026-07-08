import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="tm-app-shell">
      <section className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-12">
        <h1 className="sr-only">Terraforming Mars Stats</h1>
        <Image
          alt="Terraforming Mars Statistics"
          className="w-full rounded-2xl"
          height={793}
          priority
          src="/banner.png"
          unoptimized
          width={1983}
        />
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
