import { describe, expect, it } from 'vitest';
import { parseImportParticipants } from './parse-import-participants';

describe('parseImportParticipants', () => {
  it('parses newline and comma separated participant names in order', () => {
    expect(
      parseImportParticipants('Friday Mars\nSecond Seat, Third Seat'),
    ).toEqual(['Friday Mars', 'Second Seat', 'Third Seat']);
  });

  it('allows the manual participant field to be blank', () => {
    expect(parseImportParticipants('   ')).toEqual([]);
  });

  it('rejects duplicate participant aliases after normalization', () => {
    expect(() => parseImportParticipants('Friday Mars\nfriday-mars')).toThrow(
      /must be unique/i,
    );
  });

  it('accepts a full five-player game', () => {
    expect(
      parseImportParticipants('One, Two, Three, Four, Five'),
    ).toHaveLength(5);
  });

  it('rejects a sixth participant instead of letting it reach the matcher', () => {
    expect(() =>
      parseImportParticipants('One, Two, Three, Four, Five, Six'),
    ).toThrow(/at most 5/);
  });

  it('rejects a bulk name list posted through the participants field', () => {
    const probe = Array.from({ length: 64 }, (_, index) => `Probe ${index}`).join(
      '\n',
    );

    expect(() => parseImportParticipants(probe)).toThrow(/at most 5/);
  });

  it('rejects an overlong participant name', () => {
    expect(() => parseImportParticipants('y'.repeat(129))).toThrow(
      /longer than 128 characters/,
    );
  });
});
