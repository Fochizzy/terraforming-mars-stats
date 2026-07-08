import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the Terraforming Mars stats CTA', () => {
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
    expect(signInLink).toHaveClass('tm-button-primary');
  });

  it('crops the banner artwork and keeps section navigation attached to the banner', () => {
    const { container } = render(<HomePage />);

    const bannerFrame = container.querySelector('.tm-landing-banner-frame');
    const sectionNav = screen.getByRole('navigation', {
      name: /homepage sections/i,
    });

    expect(bannerFrame).toHaveClass('tm-landing-banner-frame--cropped');
    expect(sectionNav).toHaveClass('tm-landing-tab-strip--banner-width');
    expect(sectionNav).not.toHaveClass('tm-landing-tab-strip--full-width');
    expect(sectionNav.parentElement).toHaveClass('tm-landing-hero-module');
    expect(bannerFrame?.nextElementSibling).toBe(sectionNav);
  });
});
