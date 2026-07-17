import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cards: [
    {
      id: 'full-catalog-card',
      cardNumber: '001',
      cardName: 'A full catalog card',
      cardType: 'Event',
      expansionCode: 'base',
      promoSetSlug: null,
      printedVictoryPoints: null,
      requiredExpansionCodes: [],
      thumbnailUrl: null,
      fullImageUrl: null,
      sourceTags: [],
      victoryPointsKind: 'none' as const,
    },
  ],
  listCardLookupRecords: vi.fn(),
}));

vi.mock('@/components/layout/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/features/catalog/card-lookup-browser', () => ({
  CardLookupBrowser: ({ cards }: { cards: typeof mocks.cards }) => (
    <div data-card-count={cards.length}>{cards[0]?.cardName}</div>
  ),
}));
vi.mock('@/features/groups/group-switcher', () => ({
  GroupSwitcher: () => <div>group switcher</div>,
}));
vi.mock('@/features/groups/require-group-context', () => ({
  requireGroupContextOrRedirect: vi.fn().mockResolvedValue({ groupId: 'group-1' }),
}));
vi.mock('@/lib/db/reference-repo', () => ({
  listCardLookupRecords: mocks.listCardLookupRecords,
}));

import CardsPage from './page';

describe('CardsPage', () => {
  it('loads repository-backed full lookup records instead of promo-only records', async () => {
    mocks.listCardLookupRecords.mockResolvedValue(mocks.cards);

    render(await CardsPage());

    expect(mocks.listCardLookupRecords).toHaveBeenCalledOnce();
    expect(screen.getByText('A full catalog card')).toHaveAttribute('data-card-count', '1');
  });
});
