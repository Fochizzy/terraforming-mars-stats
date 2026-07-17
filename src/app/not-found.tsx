import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="tm-app-shell flex min-h-screen items-center justify-center px-4">
      <section aria-labelledby="not-found-heading" className="tm-panel max-w-lg">
        <p className="tm-display-eyebrow text-[11px]">Route unavailable</p>
        <h1 className="tm-panel-title mt-2 text-xl" id="not-found-heading">
          Page not found
        </h1>
        <p className="tm-muted-copy mt-3 text-sm">
          This address does not match an available TM Stats destination.
        </p>
        <Link className="tm-button-primary mt-5 inline-flex" href="/">
          Return home
        </Link>
      </section>
    </main>
  );
}
