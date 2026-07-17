import { describe, expect, it } from 'vitest';
import { isRenderableCardImage } from './card-image';

describe('isRenderableCardImage', () => {
  it('accepts approved image URLs and rejects missing or known placeholder assets', () => {
    expect(isRenderableCardImage('https://assets.example.test/card.webp')).toBe(true);
    expect(isRenderableCardImage(null)).toBe(false);
    expect(isRenderableCardImage('https://example.herokuapp.com/file.png')).toBe(false);
    expect(isRenderableCardImage('https://assets.example.test/file.svg')).toBe(false);
  });
});
