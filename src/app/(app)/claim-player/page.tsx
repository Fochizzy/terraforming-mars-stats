import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AppShell } from '@/components/layout/app-shell';
import {
  claimSavedPlayerProfile,
  listClaimablePlayerProfiles,
} from '@/lib/db/player-claim-repo';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';

const claimPlayerNavItems = [{ href: '/profile', label: 'My Profile' }] as const;

function getMatchLabel(matchReason: 'exact' | 'partial') {
  return matchReason === 'exact' ? 'Exact name match' : 'Possible name match';
}

export default async function ClaimPlayerPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);
  const candidates = await listClaimablePlayerProfiles();

  async function handleClaim(formData: FormData) {
    'use server';

    const playerId = z.string().min(1).parse(formData.get('playerId'));
    await claimSavedPlayerProfile(playerId);
    redirect(nextPath);
  }

  async function handleSkip() {
    'use server';

    redirect('/profile');
  }

  return (
    <AppShell navItems={[...claimPlayerNavItems]} title="Claim Saved Player">
      <section className="tm-panel flex flex-col gap-4">
        <p className="tm-body-copy text-sm">
          We found saved player profiles that may already contain your
          Terraforming Mars history.
        </p>
        {candidates.length === 0 ? (
          <p className="tm-muted-copy text-sm">
            No matching saved player profiles were found yet. You can keep this
            account and claim a saved roster entry later.
          </p>
        ) : (
          <ul className="grid gap-3">
            {candidates.map((candidate) => (
              <li className="tm-stat-card" key={candidate.playerId}>
                <p className="font-semibold text-stone-100">{candidate.playerName}</p>
                <p className="tm-muted-copy mt-1 text-sm">{candidate.groupName}</p>
                <p className="tm-data-label mt-3">
                  {getMatchLabel(candidate.matchReason)}
                </p>
                <form action={handleClaim} className="mt-4">
                  <input name="playerId" type="hidden" value={candidate.playerId} />
                  <button className="tm-button-primary" type="submit">
                    Claim This Profile
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={handleSkip}>
          <button className="tm-button-secondary" type="submit">
            Skip For Now
          </button>
        </form>
      </section>
    </AppShell>
  );
}
