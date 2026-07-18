import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { resolveStaticSiteAsset } from '@/lib/assets';
import { LeaderboardRankBadge } from './leaderboard-rank-badge';

describe('LeaderboardRankBadge', () => {
  it('always shows the visible rank number, decorated by the resolved laurel image', () => {
    const { container } = render(
      <LeaderboardRankBadge
        laurelAsset={resolveStaticSiteAsset('leaderboard-laurel-gold')}
        rank={1}
      />,
    );

    expect(screen.getByText('#1')).toBeInTheDocument();
    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('aria-hidden', 'true');
    expect(image).toHaveAttribute('alt', '');
  });

  it('renders no image when a rank has no laurel (4th place and below)', () => {
    const { container } = render(<LeaderboardRankBadge laurelAsset={null} rank={4} />);

    expect(screen.getByText('#4')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('keeps the rank number visible and drops the image if it fails to load', () => {
    const { container } = render(
      <LeaderboardRankBadge
        laurelAsset={resolveStaticSiteAsset('leaderboard-laurel-silver')}
        rank={2}
      />,
    );

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    fireEvent.error(image!);

    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
