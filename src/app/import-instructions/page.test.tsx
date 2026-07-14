import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ImportInstructionsPage from './page';

describe('ImportInstructionsPage', () => {
  it('renders the public upload guide with the randomized setup warning', () => {
    render(<ImportInstructionsPage />);

    expect(
      screen.getByRole('heading', { name: /upload and finalize a game/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /this reader cannot use randomized milestones, awards, or tiles/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start upload/i })).toHaveAttribute(
      'href',
      '/log-game',
    );
    expect(screen.getAllByRole('img')).toHaveLength(12);
  });
});
