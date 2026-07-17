import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageContainer } from './page-container';

describe('PageContainer', () => {
  it('applies the standard width, gutters, and vertical padding', () => {
    const { container } = render(<PageContainer>content</PageContainer>);

    const element = container.firstElementChild;
    expect(element?.tagName).toBe('DIV');
    expect(element).toHaveClass(
      'mx-auto',
      'w-full',
      'max-w-[1600px]',
      'px-4',
      'sm:px-6',
      'lg:px-8',
      'xl:px-10',
      'py-6',
    );
  });

  it('supports semantic elements, narrow width, and disabling padding', () => {
    const { container } = render(
      <PageContainer as="section" padded={false} width="narrow">
        content
      </PageContainer>,
    );

    const element = container.firstElementChild;
    expect(element?.tagName).toBe('SECTION');
    expect(element).toHaveClass('max-w-6xl');
    expect(element).not.toHaveClass('py-6');
  });
});
