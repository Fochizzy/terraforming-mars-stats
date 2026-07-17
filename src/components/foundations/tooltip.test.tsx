import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InfoTooltip, Tooltip } from './tooltip';

describe('InfoTooltip', () => {
  it('renders a focusable trigger that describes itself with the content', () => {
    render(
      <InfoTooltip
        content="Wins divided by eligible games."
        label="About Win Rate"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'About Win Rate' });
    expect(trigger).toHaveAccessibleDescription(
      'Wins divided by eligible games.',
    );
    expect(screen.getByRole('tooltip')).not.toHaveClass('tm-tooltip-visible');
  });

  it('shows on keyboard focus and hides on Escape', async () => {
    const user = userEvent.setup();
    render(<InfoTooltip content="Definition" />);

    await user.tab();
    expect(
      screen.getByRole('button', { name: 'More information' }),
    ).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveClass('tm-tooltip-visible');

    await user.keyboard('{Escape}');
    expect(screen.getByRole('tooltip')).not.toHaveClass('tm-tooltip-visible');
  });

  it('hides again when focus leaves the trigger', async () => {
    const user = userEvent.setup();
    render(
      <>
        <InfoTooltip content="Definition" />
        <button type="button">next control</button>
      </>,
    );

    await user.tab();
    expect(screen.getByRole('tooltip')).toHaveClass('tm-tooltip-visible');

    await user.tab();
    expect(screen.getByRole('button', { name: 'next control' })).toHaveFocus();
    expect(screen.getByRole('tooltip')).not.toHaveClass('tm-tooltip-visible');
  });

  it('shows on hover and hides on unhover', async () => {
    const user = userEvent.setup();
    render(<InfoTooltip content="Definition" />);

    await user.hover(screen.getByRole('button', { name: 'More information' }));
    expect(screen.getByRole('tooltip')).toHaveClass('tm-tooltip-visible');

    await user.unhover(
      screen.getByRole('button', { name: 'More information' }),
    );
    expect(screen.getByRole('tooltip')).not.toHaveClass('tm-tooltip-visible');
  });

  it('supports bottom placement without changing behavior', () => {
    render(<InfoTooltip content="Definition" placement="bottom" />);

    expect(screen.getByRole('tooltip')).toHaveAttribute(
      'data-placement',
      'bottom',
    );
  });
});

describe('Tooltip', () => {
  it('describes the wrapped interactive child and toggles on focus', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Opens the full methodology.">
        <button type="button">Methodology</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole('button', { name: 'Methodology' });
    expect(trigger).toHaveAccessibleDescription('Opens the full methodology.');

    await user.tab();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveClass('tm-tooltip-visible');

    await user.keyboard('{Escape}');
    expect(screen.getByRole('tooltip')).not.toHaveClass('tm-tooltip-visible');
  });
});
