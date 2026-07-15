import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  SELF_SUBJECT,
  StyleEffectivenessPanel,
  type StyleEffectivenessScopeInput,
} from './style-effectiveness';

const globalScope: StyleEffectivenessScopeInput = {
  key: 'global',
  label: 'Global',
  scoreEntries: [
    { label: 'Terraform Rating', value: 28 },
    { label: 'Card Points', value: 24 },
    { label: 'Cities', value: 12 },
  ],
  styleRows: [
    {
      averagePlacement: 1.8,
      averageScore: 92.4,
      gamesPlayed: 30,
      styleCode: 'jovian_payoff',
      winRate: 0.44,
      wins: 13,
    },
  ],
  subject: { possessive: "the field's", subject: 'the field' },
};

const personalScope: StyleEffectivenessScopeInput = {
  key: 'personal',
  label: 'Your games',
  scoreEntries: [
    { label: 'Terraform Rating', value: 30 },
    { label: 'Card Points', value: 20 },
  ],
  styleRows: [
    {
      averagePlacement: 1.9,
      averageScore: 89.5,
      gamesPlayed: 14,
      styleCode: 'balanced',
      winRate: 0.21,
      wins: 3,
    },
  ],
  subject: SELF_SUBJECT,
};

describe('StyleEffectivenessPanel', () => {
  it('defaults to the global scope and presents each style as a metric card', () => {
    render(<StyleEffectivenessPanel scopes={[personalScope, globalScope]} />);

    expect(
      screen.getByRole('heading', { name: /style effectiveness/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Global' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('heading', { name: /jovian payoff/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('92.4')).toBeInTheDocument();
    expect(screen.getByText('44%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /your games/i }));

    expect(screen.getByRole('heading', { name: /balanced/i })).toBeInTheDocument();
    expect(screen.getByText('89.5')).toBeInTheDocument();
    expect(screen.getByText('21%')).toBeInTheDocument();
  });
});
