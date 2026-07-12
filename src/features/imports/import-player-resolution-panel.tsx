import type { ImportPlayerLinkMatch } from '@/lib/imports/resolve-import-player-links';
import {
  resolvePlayerIdentityDefault,
  type PlayerIdentity,
} from '@/lib/imports/resolve-player-identity';

type ImportPlayerResolutionPanelProps = {
  creatingImportedName?: string | null;
  onCreatePlayer?: (
    importedName: string,
    username?: string,
    fullName?: string,
  ) => Promise<void>;
  onIdentityChange?: (importedName: string, identity: PlayerIdentity) => void;
  onSelectionChange: (importedName: string, playerId: string) => void;
  playerIdentities?: Record<string, PlayerIdentity>;
  playerLinks: ImportPlayerLinkMatch[];
  playerSelections: Record<string, string>;
};

/**
 * Account-linked players carry a username alongside their roster name; unlinked
 * roster players now carry one on the player row itself. Either way this page
 * identifies people by their username, so prefer it and fall back to the roster
 * name. Matching still runs across every name and the username upstream.
 */
function describeCandidateName(
  candidate: ImportPlayerLinkMatch['candidates'][number],
) {
  return candidate.linkedUsername ?? candidate.displayName;
}

function describeMatchReason(matchReason: ImportPlayerLinkMatch['candidates'][number]['matchReason']) {
  switch (matchReason) {
    case 'display_name_exact':
      return 'Matched by roster name';
    case 'full_name_exact':
      return 'Matched by profile name';
    case 'username_exact':
      return 'Matched by username';
    case 'alias_exact':
      return 'Matched by saved alias';
    case 'display_name_partial':
    case 'full_name_partial':
    case 'username_partial':
      return 'Matched by partial name';
    default:
      return 'Manual roster choice';
  }
}

export function ImportPlayerResolutionPanel({
  creatingImportedName,
  onCreatePlayer,
  onIdentityChange,
  onSelectionChange,
  playerIdentities,
  playerLinks,
  playerSelections,
}: ImportPlayerResolutionPanelProps) {
  if (playerLinks.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="tm-data-label text-xs">Player Profile Links</h3>
      <ul className="mt-3 flex flex-col gap-3 text-sm">
        {playerLinks.map((link) => {
          const selectedId = playerSelections[link.importedName] ?? '';
          const selectedCandidate =
            link.candidates.find((candidate) => candidate.id === selectedId) ??
            null;
          const defaultIdentity = resolvePlayerIdentityDefault({
            candidate: selectedCandidate,
            importedName: link.importedName,
          });
          const override = playerIdentities?.[link.importedName];
          const usernameValue = override?.username ?? defaultIdentity.username;
          const fullNameValue = override?.fullName ?? defaultIdentity.fullName;

          return (
            <li
              className="rounded-xl bg-white/[0.03] px-3 py-3"
              key={link.importedName}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-stone-100">{link.importedName}</span>
                  <span className="text-xs" style={{ color: 'var(--tm-muted)' }}>
                    {link.requiresConfirmation
                      ? link.selectedPlayerId
                        ? 'Review suggested match'
                        : 'Choose a roster player'
                      : 'Auto-matched'}
                  </span>
                </div>
                <span className="tm-coverage-badge">{link.status}</span>
              </div>
              <label className="mt-3 flex flex-col gap-2 text-sm">
                <span className="sr-only">{`Match imported player ${link.importedName}`}</span>
                <select
                  aria-label={`Match imported player ${link.importedName}`}
                  className="tm-input"
                  onChange={(event) =>
                    onSelectionChange(link.importedName, event.target.value)
                  }
                  value={selectedId}
                >
                  <option value="">Choose player...</option>
                  {link.candidates.map((candidate) => (
                    <option key={`${link.importedName}-${candidate.id}`} value={candidate.id}>
                      {describeCandidateName(candidate)}
                      {candidate.gamesPlayed > 0
                        ? ` (${candidate.gamesPlayed} games)`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="tm-data-label text-[10px]">Username</span>
                  <input
                    aria-label={`Username for ${link.importedName}`}
                    className="tm-input"
                    onChange={(event) =>
                      onIdentityChange?.(link.importedName, {
                        fullName: fullNameValue,
                        username: event.target.value,
                      })
                    }
                    placeholder="Username"
                    value={usernameValue}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="tm-data-label text-[10px]">Full name</span>
                  <input
                    aria-label={`Full name for ${link.importedName}`}
                    className="tm-input"
                    onChange={(event) =>
                      onIdentityChange?.(link.importedName, {
                        fullName: event.target.value,
                        username: usernameValue,
                      })
                    }
                    placeholder="Full name"
                    value={fullNameValue}
                  />
                </label>
              </div>
              {onCreatePlayer && link.status === 'unmatched' ? (
                <button
                  aria-label={`Create player ${link.importedName}`}
                  className="mt-3 tm-button-secondary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={creatingImportedName !== null}
                  onClick={() =>
                    void onCreatePlayer(
                      link.importedName,
                      usernameValue,
                      fullNameValue,
                    )
                  }
                  type="button"
                >
                  {creatingImportedName === link.importedName
                    ? 'Creating Player...'
                    : 'Create Player'}
                </button>
              ) : null}
              <p className="mt-2 text-xs" style={{ color: 'var(--tm-muted)' }}>
                {describeMatchReason(
                  selectedCandidate?.matchReason ?? 'fallback',
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
