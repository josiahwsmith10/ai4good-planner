import type { AppState } from './store';
import { emptyFilters } from './store';

// Shareable view state lives in location.hash (static host — no server routing, no 404s):
// which day is shown and which filters are applied, so a link reproduces a filtered view.

export interface DecodeContext {
  validYears: number[];
  validDays: string[];
  validLocations: string[];
  validTopics: string[];
  validEventTypes: string[];
}

function keepValid(csv: string | null, valid: string[]): Set<string> {
  if (!csv) return new Set();
  const allow = new Set(valid);
  return new Set(
    csv
      .split(',')
      .map((s) => decodeURIComponent(s))
      .filter((s) => allow.has(s)),
  );
}

/** Parse the current hash into a partial state, discarding anything not valid for the data. */
export function decodeHash(hash: string, ctx: DecodeContext): Partial<AppState> {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const out: Partial<AppState> = {};

  const y = Number(params.get('y'));
  if (ctx.validYears.includes(y)) out.year = y;

  const d = params.get('d');
  if (d && ctx.validDays.includes(d)) out.day = d;

  const filters = emptyFilters();
  filters.locations = keepValid(params.get('loc'), ctx.validLocations);
  filters.topics = keepValid(params.get('topic'), ctx.validTopics);
  filters.eventTypes = keepValid(params.get('type'), ctx.validEventTypes);
  filters.hideInvitationOnly = params.get('inv') === '1';
  filters.search = params.get('q') ?? '';
  out.filters = filters;

  return out;
}

/** Serialize the shareable parts of state into a hash string (no leading '#'). */
export function encodeHash(state: AppState): string {
  const p = new URLSearchParams();
  p.set('y', String(state.year));
  p.set('d', state.day);
  if (state.filters.locations.size) p.set('loc', [...state.filters.locations].join(','));
  if (state.filters.topics.size) p.set('topic', [...state.filters.topics].join(','));
  if (state.filters.eventTypes.size) p.set('type', [...state.filters.eventTypes].join(','));
  if (state.filters.hideInvitationOnly) p.set('inv', '1');
  if (state.filters.search) p.set('q', state.filters.search);
  return p.toString();
}

export function hasHash(): boolean {
  return location.hash.replace(/^#/, '').length > 0;
}
