import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GlossaryPage from './page';

describe('GlossaryPage', () => {
  it('resolves the canonical glossary route', () => {
    render(<GlossaryPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Glossary' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /glossary sections/i })).toBeInTheDocument();
  });
});
