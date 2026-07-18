import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';

export default function LogGameDraftNotFound() {
  return (
    <AppShell hasActiveGroup title="Log a Game">
      <section
        aria-labelledby="draft-not-found-heading"
        className="tm-panel max-w-2xl"
      >
        <p className="tm-display-eyebrow text-[11px]">Draft unavailable</p>
        <h2
          className="tm-panel-title mt-2 text-xl"
          id="draft-not-found-heading"
        >
          This saved draft cannot be opened
        </h2>
        <p className="tm-muted-copy mt-3 text-sm">
          It may have been finalized or removed, or it may belong to another
          group. Access checks do not reveal drafts outside your current group.
        </p>
        <nav
          aria-label="Continue in Log a Game"
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
        >
          <Link className="tm-button-primary tm-focus-ring min-h-11" href="/log-game">
            Start Manual Entry
          </Link>
          <Link
            className="tm-button-secondary tm-focus-ring min-h-11"
            href="/log-game/import"
          >
            Import Game
          </Link>
          <Link className="tm-button-secondary tm-focus-ring min-h-11" href="/games">
            Saved Games
          </Link>
        </nav>
      </section>
    </AppShell>
  );
}
