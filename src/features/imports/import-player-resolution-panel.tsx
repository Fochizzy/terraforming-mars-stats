import type { ImportPlayerLinkMatch } from '@/lib/imports/resolve-import-player-links';

type ImportPlayerResolutionPanelProps = {
  playerLinks: ImportPlayerLinkMatch[];
};

export function ImportPlayerResolutionPanel({
  playerLinks,
}: ImportPlayerResolutionPanelProps) {
  if (playerLinks.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="tm-data-label text-xs">Player Profile Links</h3>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {playerLinks.map((link) => (
          <li
            className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2"
            key={link.importedName}
          >
            <span className="font-medium text-stone-100">{link.importedName}</span>
            <span className="tm-coverage-badge">{link.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
