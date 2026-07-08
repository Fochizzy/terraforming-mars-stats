import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { describeUnknownError } from './describe-unknown-error';

describe('describeUnknownError', () => {
  it('formats zod validation issues as readable field messages', () => {
    const schema = z.object({
      playerScores: z.record(
        z.string(),
        z.object({
          cardPointsMicrobes: z.number().min(0).optional(),
        }),
      ),
    });
    const result = schema.safeParse({
      playerScores: {
        '2cd70015-9878-494a-85c0-2fab9e080ad6': { cardPointsMicrobes: -4 },
      },
    });

    expect(result.success).toBe(false);

    const message = describeUnknownError(result.error, 'fallback');

    expect(message).toBe(
      'Check these values: card points microbes must be at least 0.',
    );
  });

  it('keeps plain error messages untouched', () => {
    expect(describeUnknownError(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('falls back for unrecognized values', () => {
    expect(describeUnknownError(42, 'fallback')).toBe('fallback');
  });
});
