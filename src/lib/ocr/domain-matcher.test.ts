import { describe, expect, it } from 'vitest';
import { correctOcrText, extractOcrEntityCandidate } from './correct-ocr-line';
import { buildDomainIndex, matchDomainText } from './domain-matcher';

const index = buildDomainIndex([
  {
    aliases: ['Asteroid Mining Consortlum'],
    id: 'card-1',
    name: 'Asteroid Mining Consortium',
    type: 'card',
  },
  {
    id: 'card-2',
    name: 'Jovian Embassy',
    type: 'card',
  },
  {
    id: 'corp-1',
    name: 'Tharsis Republic',
    type: 'corporation',
  },
]);

describe('domain OCR matching', () => {
  it('matches a confirmed alias exactly', () => {
    const result = matchDomainText({
      allowedTypes: ['card'],
      index,
      text: 'Asteroid Mining Consortlum',
    });

    expect(result.decision).toBe('auto_accept');
    expect(result.entry?.name).toBe('Asteroid Mining Consortium');
    expect(result.method).toBe('alias');
  });

  it('uses context to extract only the card name', () => {
    expect(
      extractOcrEntityCandidate(
        'Friday Mars played Asteroid Mining Consortlum',
      ),
    ).toEqual({
      entityText: 'Asteroid Mining Consortlum',
      entityType: 'card',
      prefix: 'Friday Mars played ',
      suffix: '',
    });
  });

  it('preserves original text while correcting an accepted entity', () => {
    const result = correctOcrText({
      index,
      text: 'Friday Mars played Asteroid Mining Consortlum',
    });

    expect(result.lines[0]?.originalText).toBe(
      'Friday Mars played Asteroid Mining Consortlum',
    );
    expect(result.correctedText).toBe(
      'Friday Mars played Asteroid Mining Consortium',
    );
  });

  it('does not auto-accept weak unresolved text', () => {
    const result = matchDomainText({
      allowedTypes: ['card'],
      index,
      text: 'Completely Unknown Thing',
    });

    expect(result.decision).toBe('unresolved');
    expect(result.entry).toBeNull();
  });
});
