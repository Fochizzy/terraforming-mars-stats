import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Heading, Text } from './typography';

describe('Heading', () => {
  it('renders the requested heading level independent of visual style', () => {
    render(
      <Heading level={3} size="xl" variant="display">
        Global Meta
      </Heading>,
    );

    const heading = screen.getByRole('heading', { level: 3, name: 'Global Meta' });
    expect(heading).toHaveClass('tm-display-title');
  });

  it('uses the panel title treatment by default', () => {
    render(<Heading level={2}>Score Sources</Heading>);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveClass('tm-panel-title');
  });
});

describe('Text', () => {
  it('renders body copy as a paragraph by default', () => {
    render(<Text>Explanatory copy</Text>);

    const text = screen.getByText('Explanatory copy');
    expect(text.tagName).toBe('P');
    expect(text).toHaveClass('tm-body-copy');
  });

  it('supports variant and element overrides', () => {
    render(
      <Text as="span" variant="label">
        Win Rate
      </Text>,
    );

    const text = screen.getByText('Win Rate');
    expect(text.tagName).toBe('SPAN');
    expect(text).toHaveClass('tm-data-label');
  });
});
