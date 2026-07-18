import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ManualEntryStepNavigation } from './manual-entry-step-navigation';
import {
  MANUAL_ENTRY_STEPS,
  type ManualEntryStepErrorCounts,
  type ManualEntryStepId,
} from './manual-entry-steps';

const NO_ERRORS: ManualEntryStepErrorCounts = {
  setup: 0,
  players: 0,
  milestones: 0,
  scores: 0,
  details: 0,
  review: 0,
};

function renderNavigation({
  activeStepId = 'setup' as ManualEntryStepId,
  errorCounts = NO_ERRORS,
  onSelectStep = vi.fn(),
  visitedStepIds = new Set<ManualEntryStepId>(['setup']),
} = {}) {
  render(
    <ManualEntryStepNavigation
      activeStepId={activeStepId}
      errorCounts={errorCounts}
      onSelectStep={onSelectStep}
      visitedStepIds={visitedStepIds}
    />,
  );

  return { onSelectStep };
}

describe('ManualEntryStepNavigation', () => {
  it('renders semantic navigation with every canonical step label', () => {
    renderNavigation();

    const nav = screen.getByRole('navigation', { name: /manual entry steps/i });

    for (const step of MANUAL_ENTRY_STEPS) {
      expect(
        within(nav).getByRole('button', { name: new RegExp(step.label, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('shows a step counter with the accessible full label', () => {
    renderNavigation({ activeStepId: 'milestones' });

    const counter = screen.getByTestId('manual-entry-step-counter');

    expect(counter).toHaveTextContent('Step 3 of 6');
    expect(counter).toHaveTextContent('Milestones & Awards');
  });

  it('marks only the active step with aria-current="step"', () => {
    renderNavigation({ activeStepId: 'players' });

    const nav = screen.getByRole('navigation', { name: /manual entry steps/i });
    const buttons = within(nav).getAllByRole('button');
    const currentButtons = buttons.filter(
      (button) => button.getAttribute('aria-current') === 'step',
    );

    expect(currentButtons).toHaveLength(1);
    expect(currentButtons[0]).toHaveAccessibleName(/players & corporations/i);
  });

  it('announces completed state without relying on color', () => {
    renderNavigation({
      activeStepId: 'milestones',
      visitedStepIds: new Set<ManualEntryStepId>([
        'setup',
        'players',
        'milestones',
      ]),
    });

    expect(
      screen.getByRole('button', { name: /setup, completed/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /players & corporations, completed/i,
      }),
    ).toBeInTheDocument();
  });

  it('announces visited error steps with their blocking issue count', () => {
    renderNavigation({
      activeStepId: 'review',
      errorCounts: { ...NO_ERRORS, players: 2, scores: 1 },
      visitedStepIds: new Set<ManualEntryStepId>([
        'setup',
        'players',
        'milestones',
        'scores',
        'details',
        'review',
      ]),
    });

    expect(
      screen.getByRole('button', {
        name: /players & corporations, has 2 validation issues/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /final scores, has 1 validation issue/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /setup, completed/i }),
    ).toBeInTheDocument();
  });

  it('does not flag unvisited upcoming steps as completed or errored', () => {
    renderNavigation({
      activeStepId: 'setup',
      errorCounts: { ...NO_ERRORS, players: 2 },
      visitedStepIds: new Set<ManualEntryStepId>(['setup']),
    });

    const playersButton = screen.getByRole('button', {
      name: /players & corporations/i,
    });

    expect(playersButton).not.toHaveAccessibleName(/completed/i);
    expect(playersButton).not.toHaveAccessibleName(/validation issue/i);
  });

  it('invokes the selection callback for pointer and keyboard activation', async () => {
    const user = userEvent.setup();
    const { onSelectStep } = renderNavigation();

    await user.click(
      screen.getByRole('button', { name: /final scores/i }),
    );
    expect(onSelectStep).toHaveBeenCalledWith('scores');

    const reviewButton = screen.getByRole('button', { name: /^review/i });
    reviewButton.focus();
    expect(reviewButton).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSelectStep).toHaveBeenCalledWith('review');
  });
});
