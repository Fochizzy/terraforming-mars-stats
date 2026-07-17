import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HISTORICAL_GLOSSARY_ENTRY_SLUGS } from './glossary-data';
import { GlossaryContent } from './glossary-content';

const scrollIntoView = vi.fn();

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: scrollIntoView,
});

function setHash(hash: string) {
  window.history.replaceState(null, '', hash);
  fireEvent(window, new HashChangeEvent('hashchange'));
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
  scrollIntoView.mockClear();
});

describe('GlossaryContent', () => {
  it('renders all preserved entries and accessible category navigation', () => {
    render(<GlossaryContent />);

    expect(HISTORICAL_GLOSSARY_ENTRY_SLUGS.every((slug) => document.getElementById(slug))).toBe(true);
    expect(screen.getByRole('navigation', { name: /glossary sections/i })).toBeInTheDocument();
    expect(screen.getByText('Cards Purchased')).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable')).toHaveLength(6);
  });

  it('handles reload, history hash changes, focus, and an unknown destination intentionally', async () => {
    window.history.replaceState(null, '', '#win-rate');
    render(<GlossaryContent />);

    const winRate = document.getElementById('win-rate');
    await waitFor(() => expect(winRate).toHaveAttribute('data-glossary-target', 'true'));
    expect(document.activeElement).toBe(winRate);
    expect(scrollIntoView).toHaveBeenCalled();

    setHash('#card-database');
    await waitFor(() =>
      expect(document.getElementById('card-database')).toHaveAttribute(
        'data-glossary-target',
        'true',
      ),
    );

    setHash('#retired-entry');
    expect(await screen.findByRole('status')).toHaveTextContent('retired-entry');
  });
});
