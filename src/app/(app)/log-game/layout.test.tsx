import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LogGameLayout from './layout';

describe('LogGameLayout', () => {
  it('applies the Supabase background with an exact bundled fallback', () => {
    render(
      <LogGameLayout>
        <p>Log a Game content</p>
      </LogGameLayout>,
    );

    expect(screen.getByText('Log a Game content')).toBeInTheDocument();
    expect(screen.getByTestId('log-game-background')).toHaveStyle({
      backgroundImage: expect.stringContaining(
        '/storage/v1/object/public/tm-map-images/backgrounds/log-game-mars-horizon-f78061b5.png',
      ),
    });
    expect(screen.getByTestId('log-game-background')).toHaveStyle({
      backgroundImage: expect.stringContaining(
        '/site-assets/log-game-mars-horizon-f78061b5.png',
      ),
    });
  });
});
