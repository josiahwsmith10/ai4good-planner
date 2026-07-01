import { describe, it, expect } from 'vitest';
import { encodeHash, decodeHash } from './urlState';
import { emptyFilters, type AppState } from './store';

describe('hash encode/decode', () => {
  const base: AppState = {
    year: 2026,
    day: '2026-07-08',
    filters: {
      ...emptyFilters(),
      locations: new Set(['Room Q']),
      hideInvitationOnly: true,
      search: 'ai',
    },
    pxPerMin: 1.3,
    colWidths: {},
    themePref: 'system',
  };
  const ctx = {
    validYears: [2026],
    validDays: ['2026-07-07', '2026-07-08'],
    validLocations: ['Room Q', 'Room R'],
    validTopics: [] as string[],
    validEventTypes: [] as string[],
  };

  it('round-trips shareable view state (day + filters)', () => {
    const decoded = decodeHash(`#${encodeHash(base)}`, ctx);
    expect(decoded.year).toBe(2026);
    expect(decoded.day).toBe('2026-07-08');
    expect([...(decoded.filters?.locations ?? [])]).toEqual(['Room Q']);
    expect(decoded.filters?.hideInvitationOnly).toBe(true);
    expect(decoded.filters?.search).toBe('ai');
  });

  it('drops values that are not valid for the loaded data', () => {
    const decoded = decodeHash('#y=2099&d=2026-07-31&loc=Nowhere', ctx);
    expect(decoded.year).toBeUndefined(); // 2099 not a valid year
    expect(decoded.day).toBeUndefined(); // invalid day
    expect([...(decoded.filters?.locations ?? [])]).toEqual([]); // unknown stage dropped
  });
});
