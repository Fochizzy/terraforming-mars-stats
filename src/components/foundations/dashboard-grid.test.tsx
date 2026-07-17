import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardGrid } from './dashboard-grid';

describe('DashboardGrid', () => {
  it('collapses to one column on mobile and expands responsively for KPIs', () => {
    const { container } = render(
      <DashboardGrid variant="kpi">
        <div>a</div>
        <div>b</div>
      </DashboardGrid>,
    );

    const grid = container.firstElementChild;
    expect(grid).toHaveClass('grid', 'gap-3', 'sm:grid-cols-2', 'xl:grid-cols-4');
    expect(grid).not.toHaveClass('grid-cols-2');
  });

  it('supports the split variant and list semantics', () => {
    const { container } = render(
      <DashboardGrid as="ul" variant="split">
        <li>a</li>
      </DashboardGrid>,
    );

    const grid = container.firstElementChild;
    expect(grid?.tagName).toBe('UL');
    expect(grid).toHaveClass('lg:grid-cols-2');
  });
});
