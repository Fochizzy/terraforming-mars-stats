import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CombinedDashboardLayout } from './combined-dashboard-layout';

describe('CombinedDashboardLayout', () => {
  it('renders clearly labeled coordinated regions', () => {
    render(
      <CombinedDashboardLayout
        detail={<div>Detail</div>}
        evidence={<div>Evidence</div>}
        insights={<div>Insights</div>}
        primary={<div>Primary</div>}
        supporting={<div>Supporting</div>}
        toolbar={<div>Toolbar</div>}
      />,
    );

    for (const label of [
      'Dashboard controls',
      'Primary visualization',
      'Supporting visualization',
      'Insight rail',
      'Evidence table',
      'Selection details',
    ]) {
      expect(screen.getByRole('region', { name: label })).toBeInTheDocument();
    }
  });

  it('uses mobile-first order and the shared desktop grid columns', () => {
    render(
      <CombinedDashboardLayout
        evidence={<div>Evidence</div>}
        insights={<div>Insights</div>}
        primary={<div>Primary</div>}
        supporting={<div>Supporting</div>}
      />,
    );

    expect(screen.getByRole('region', { name: 'Primary visualization' })).toHaveClass(
      'order-2',
      'lg:col-span-8',
    );
    expect(
      screen.getByRole('region', { name: 'Supporting visualization' }),
    ).toHaveClass('order-3', 'lg:col-span-4');
    expect(screen.getByRole('region', { name: 'Evidence table' })).toHaveClass(
      'order-5',
      'lg:col-span-8',
    );
  });

  it('keeps dashboard interaction transitions disabled for reduced motion', () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/globals.css'),
      'utf8',
    );
    const reducedMotionBlock = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reducedMotionBlock).toContain('.tm-dashboard-legend-button');
    expect(reducedMotionBlock).toContain('transition: none');
  });
});
