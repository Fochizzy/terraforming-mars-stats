import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  describeMatcherFailureCode,
  IMPORT_MATCHER_AUDIT_EVENT,
  logImportMatcherInvocation,
} from './import-matcher-audit';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logImportMatcherInvocation', () => {
  it('emits one indexable line with the requester, the group and the counts', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logImportMatcherInvocation({
      candidateNameCount: 4,
      errorCode: null,
      groupId: 'group-1',
      matchCount: 3,
      outcome: 'matched',
      source: 'import_analyze',
      userId: 'user-1',
    });

    expect(info).toHaveBeenCalledTimes(1);
    expect(JSON.parse(info.mock.calls[0]![0] as string)).toEqual({
      candidateNameCount: 4,
      errorCode: null,
      event: IMPORT_MATCHER_AUDIT_EVENT,
      groupId: 'group-1',
      matchCount: 3,
      outcome: 'matched',
      source: 'import_analyze',
      userId: 'user-1',
    });
  });

  it('records the invocation even when the session id could not be resolved', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logImportMatcherInvocation({
      candidateNameCount: 1,
      errorCode: '42501',
      groupId: 'group-1',
      matchCount: 0,
      outcome: 'failed',
      source: 'log_game_player_resolution',
      userId: null,
    });

    const record = JSON.parse(info.mock.calls[0]![0] as string);

    expect(record.userId).toBeNull();
    expect(record.outcome).toBe('failed');
    expect(record.errorCode).toBe('42501');
  });

  it('carries counts and ids only — never a name, a label or free text', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logImportMatcherInvocation({
      candidateNameCount: 2,
      errorCode: null,
      groupId: 'group-1',
      matchCount: 2,
      outcome: 'matched',
      source: 'import_analyze',
      userId: 'user-1',
    });

    const record = JSON.parse(info.mock.calls[0]![0] as string);

    // A log that quoted the probed names would recreate, in the log stream, the
    // disclosure the matcher RPC exists to prevent.
    expect(Object.keys(record).sort()).toEqual([
      'candidateNameCount',
      'errorCode',
      'event',
      'groupId',
      'matchCount',
      'outcome',
      'source',
      'userId',
    ]);
  });
});

describe('describeMatcherFailureCode', () => {
  it('prefers a PostgREST code', () => {
    expect(
      describeMatcherFailureCode({ code: '42501', message: 'Izzy Hodnett' }),
    ).toBe('42501');
  });

  it('falls back to the error name, never the message', () => {
    const error = new Error('name "Izzy Hodnett" is invalid');

    expect(describeMatcherFailureCode(error)).toBe('Error');
  });

  it('returns null when neither is available', () => {
    expect(describeMatcherFailureCode('Izzy Hodnett')).toBeNull();
  });
});
