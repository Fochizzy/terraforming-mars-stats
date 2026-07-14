import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileLoadingPopup } from './profile-loading-popup';

describe('ProfileLoadingPopup', () => {
  it('announces that profile analytics are loading', () => {
    const { container } = render(<ProfileLoadingPopup />);

    expect(
      screen.getByRole('status', { name: /loading profile/i }),
    ).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
    expect(
      screen.getByText(/latest games, performance, and card analytics/i),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('.tm-profile-loading-dot'),
    ).toHaveLength(3);
  });
});
