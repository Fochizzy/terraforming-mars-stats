import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ResetPinPage from './page';

describe('ResetPinPage', () => {
  it('renders the recovery heading and reset form', async () => {
    render(await ResetPinPage({}));

    expect(
      screen.getByRole('heading', { name: /set a new pin/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /update pin/i }),
    ).toBeInTheDocument();
  });
});
