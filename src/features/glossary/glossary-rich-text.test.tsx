import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GlossaryRichText } from './glossary-rich-text';

describe('GlossaryRichText', () => {
  it('links safe plain text without changing visible text', () => {
    const { container } = render(
      <p>
        <GlossaryRichText>Win Rate and CARD DATABASE.</GlossaryRichText>
      </p>,
    );

    expect(container.querySelector('p')).toHaveTextContent(
      'Win Rate and CARD DATABASE.',
    );
    expect(screen.getByRole('link', { name: 'Win Rate' })).toHaveAttribute(
      'href',
      '/glossary#win-rate',
    );
    expect(screen.getByRole('link', { name: 'CARD DATABASE' })).toHaveAttribute(
      'href',
      '/glossary#card-database',
    );
  });

  it('does not create links in existing or interactive content and prevents self links', () => {
    const { container } = render(
      <GlossaryRichText contextEntrySlug="win-rate">
        <a href="/existing">Win Rate</a>
        <button type="button">Card Database</button>
        <input aria-label="value" value="Card Database" readOnly />
        <textarea aria-label="notes" value="Card Database" readOnly />
        <code>Card Database</code>
        <pre>Card Database</pre>
        <div contentEditable>Card Database</div>
        <div role="button">Card Database</div>
        Win Rate
      </GlossaryRichText>,
    );

    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Win Rate' })).toHaveAttribute('href', '/existing');
    expect(screen.queryByRole('link', { name: 'Card Database' })).not.toBeInTheDocument();
  });
});
