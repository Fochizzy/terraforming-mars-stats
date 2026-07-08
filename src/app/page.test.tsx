import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

const sectionNames = [
  'Overview',
  'Corporations',
  'Cards',
  'Projects',
  'Milestones',
  'Stats',
  'Tools',
] as const;

describe('HomePage', () => {
  it('renders the hero CTA and homepage anchor navigation', () => {
    render(<HomePage />);

    const heading = screen.getByRole('heading', {
      name: /terraforming mars stats/i,
    });
    const signInLink = screen.getByRole('link', {
      name: /sign in to your group/i,
    });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('sr-only');
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/login');

    for (const sectionName of sectionNames) {
      const anchor = screen.getByRole('link', { name: sectionName });
      const sectionHeading = screen.getByRole('heading', {
        name: sectionName,
      });

      expect(anchor).toHaveAttribute(
        'href',
        `#${sectionName.toLowerCase()}`,
      );
      expect(sectionHeading).toBeInTheDocument();
    }
  });
});
