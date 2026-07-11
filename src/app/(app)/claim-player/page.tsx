import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AppShell } from '@/components/layout/app-shell';
import {
  claimAllExactPlayerProfiles,
  claimSavedPlayerProfile,
  listClaimablePlayerProfiles,
} from '@/lib/db/player-claim-repo';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';

const claimPlayerNavItems = [{ href: '/profile', label: 'My Profile' }] as const;

export default async function ClaimPlayerPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);
  const candidates = await listClaimablePlayerProfiles();
  const exactMatches = candidates.filter((candidate) => candidate.exactMatch);
  const partialMatches = candidates.filter((candidate) => !candidate.exactMatch);
  const exactPlayerName = exactMatches[0]?.playerName;

  async function handleClaimAll() {
    'use server';

    await claimAllExactPlayerProfiles();
    redirect(nextPath);
  }

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
          <div className="flex flex-col gap-6">
            {exactMatches.length > 0 && (
              <div className="tm-stat-card">
                <p className="font-semibold text-stone-100">{exactPlayerName}</p>
                <p className="tm-muted-copy mt-1 text-sm">
                  {exactMatches.length === 1
                    ? 'Exact name match in 1 group'
                    : `Exact name match across ${exactMatches.length} groups`}
                </p>
                <ul className="tm-muted-copy mt-3 grid gap-1 text-sm">
                  {exactMatches.map((candidate) => (
                    <li key={candidate.playerId}>{candidate.groupName}</li>
                  ))}
                </ul>
                <form action={handleClaimAll} className="mt-4">
                  <button className="tm-button-primary" type="submit">
                    {exactMatches.length === 1
                      ? 'Claim This Profile'
                      : 'Claim All My Profiles'}
                  </button>
                </form>
              </div>
            )}
            {partialMatches.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="tm-data-label">Possible name matches</p>
                <ul className="grid gap-3">
                  {partialMatches.map((candidate) => (
                    <li className="tm-stat-card" key={candidate.playerId}>
                      <p className="font-semibold text-stone-100">
                        {candidate.playerName}
                      </p>
                      <p className="tm-muted-copy mt-1 text-sm">
                        {candidate.groupName}
                      </p>
                      <form action={handleClaim} className="mt-4">
                        <input
                          name="playerId"
                          type="hidden"
                          value={candidate.playerId}
                        />
                        <button className="tm-button-primary" type="submit">
                          Claim This Profile
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
