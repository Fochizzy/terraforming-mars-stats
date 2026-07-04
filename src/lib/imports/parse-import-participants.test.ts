import { describe, expect, it } from 'vitest';
import { parseImportParticipants } from './parse-import-participants';

describe('parseImportParticipants', () => {
  it('parses newline and comma separated participant names in order', () => {
    expect(
      parseImportParticipants('Friday Mars\nSecond Seat, Third Seat'),
    ).toEqual(['Friday Mars', 'Second Seat', 'Third Seat']);
  });

  it('rejects duplicate participant aliases after normalization', () => {
    expect(() => parseImportParticipants('Friday Mars\nfriday-mars')).toThrow(
      /must be unique/i,
    );
  });
});
