import { SavedGamesPage } from '@/features/games/saved-games-page';

/** Canonical Phase 3 route; it deliberately reuses the existing game-library implementation. */
export default function GamesPage() {
  return <SavedGamesPage />;
}
