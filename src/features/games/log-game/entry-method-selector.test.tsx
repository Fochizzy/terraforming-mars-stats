import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntryMethodSelector } from './entry-method-selector';

describe('EntryMethodSelector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders accessible methods, group context, active state, and Saved Games', () => {
    render(
      <EntryMethodSelector
        currentMethod="manual"
        groupName="Friday Group"
        hasUnsavedChanges={false}
        manualHref="/log-game?gameId=11111111-1111-4111-8111-111111111111"
        workflowState="editing_manual_draft"
      />,
    );

    expect(
      screen.getByRole('navigation', { name: /log a game entry methods/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Friday Group')).toBeInTheDocument();
    expect(screen.getByText('Resumed saved draft')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manual entry/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /import game/i })).toHaveAttribute(
      'href',
      '/log-game/import',
    );
    expect(screen.getByRole('link', { name: /saved games/i })).toHaveAttribute(
      'href',
      '/games',
    );
  });

  it('does not silently switch methods or unload when work is unsaved', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <EntryMethodSelector
        currentMethod="manual"
        groupName="Friday Group"
        hasUnsavedChanges
        workflowState="editing_manual_draft"
      />,
    );

    const importLink = screen.getByRole('link', { name: /import game/i });
    expect(fireEvent.click(importLink)).toBe(false);
    expect(confirm).toHaveBeenCalledWith(
      expect.stringMatching(/unsaved game-entry changes/i),
    );

    const savedGamesLink = screen.getByRole('link', { name: /saved games/i });
    expect(fireEvent.click(savedGamesLink)).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(2);

    const beforeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);
  });

  it('represents Import Game as the active direct-route method', () => {
    render(
      <EntryMethodSelector
        currentMethod="import"
        groupName="Friday Group"
        hasUnsavedChanges={false}
        workflowState="importing"
      />,
    );

    expect(screen.getByRole('link', { name: /import game/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /manual entry/i })).toHaveAttribute(
      'href',
      '/log-game',
    );
  });
});
