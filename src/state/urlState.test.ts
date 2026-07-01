import { describe, it, expect } from 'vitest';
import { encodeMine, decodeMine, encodeHash, decodeHash } from './urlState';
import { emptyFilters, type AppState } from './store';

const ids = ['9', '11', '100', '250', '4096'];

describe('mine bitset', () => {
  it('round-trips a marked set through the id-sorted bitset', () => {
    const mine = new Set(['11', '4096']);
    const blob = encodeMine(mine, ids);
    expect(blob.startsWith('mb1:')).toBe(true);
    expect(decodeMine(blob, ids)).toEqual(mine);
  });

  it('is stable in length regardless of how many are marked', () => {
    const few = encodeMine(new Set(['9']), ids);
    const many = encodeMine(new Set(ids), ids);
    expect(few.length).toBe(many.length);
  });

  it('degrades gracefully on a malformed blob', () => {
    expect(decodeMine('not-a-blob', ids).size).toBe(0);
    expect(decodeMine('mb1:@@@@', ids).size).toBe(0);
  });
});

describe('hash encode/decode', () => {
  const base: AppState = {
    year: 2026,
    day: '2026-07-08',
    filters: { ...emptyFilters(), locations: new Set(['Room Q']), hideInvitationOnly: true },
    mine: new Set(['11']),
    mineMode: 'isolate',
    pxPerMin: 1.3,
  };
  const ctx = {
    sortedIds: ids,
    validYears: [2026],
    validDays: ['2026-07-07', '2026-07-08'],
    validLocations: ['Room Q', 'Room R'],
    validTopics: [] as string[],
    validEventTypes: [] as string[],
  };

  it('round-trips shareable state', () => {
    const decoded = decodeHash(`#${encodeHash(base, ids)}`, ctx);
    expect(decoded.year).toBe(2026);
    expect(decoded.day).toBe('2026-07-08');
    expect(decoded.mineMode).toBe('isolate');
    expect([...(decoded.mine ?? [])]).toEqual(['11']);
    expect([...(decoded.filters?.locations ?? [])]).toEqual(['Room Q']);
    expect(decoded.filters?.hideInvitationOnly).toBe(true);
  });

  it('drops values that are not valid for the loaded data', () => {
    const decoded = decodeHash('#y=2099&d=2026-07-31&loc=Nowhere', ctx);
    expect(decoded.year).toBeUndefined(); // 2099 not a valid year
    expect(decoded.day).toBeUndefined(); // invalid day
    expect([...(decoded.filters?.locations ?? [])]).toEqual([]); // unknown stage dropped
  });
});
