import { SavedGamesPage } from '@/features/games/saved-games-page';
import { pageMetadata } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/saved-games');

/** Legacy compatibility alias for bookmarked Saved Games links. */
export default function LegacySavedGamesPage() {
  return <SavedGamesPage />;
}
