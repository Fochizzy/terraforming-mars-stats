import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ImportInstructionsPage from './page';

describe('ImportInstructionsPage', () => {
  it('explains how to copy a log and rejects randomized objectives', () => {
    render(<ImportInstructionsPage />);

    expect(
      screen.getByRole('heading', { name: /how to get your game log/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /randomized map, milestone set, or award set are incompatible/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open import game/i }),
    ).toHaveAttribute('href', '/log-game/import');
    expect(
      screen.getByRole('heading', { name: /download the game log/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /save the result page as a pdf/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(4);
  });
});
