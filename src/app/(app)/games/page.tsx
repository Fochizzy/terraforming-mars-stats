import { SavedGamesPage } from '@/features/games/saved-games-page';
import { pageMetadata } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/games');

/** Canonical Phase 3 route; it deliberately reuses the existing game-library implementation. */
export default function GamesPage() {
  return <SavedGamesPage />;
}
