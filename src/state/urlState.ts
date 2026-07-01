import type { AppState, MineMode } from './store';
import { emptyFilters } from './store';

// Shareable state lives in location.hash (static host — no server routing, no 404s).
// "mine" is a version-prefixed base64url bitset over the dataset's id-sorted index, so it
// stays short (~58 chars for 339 sessions) and reproduces exactly given the same data.

const MINE_PREFIX = 'mb1:';

function base64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(s: string): Uint8Array {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  const bin = atob(t);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export function encodeMine(mine: Set<string>, sortedIds: string[]): string {
  const bytes = new Uint8Array(Math.ceil(sortedIds.length / 8));
  sortedIds.forEach((id, i) => {
    if (mine.has(id)) bytes[i >> 3] |= 1 << (i & 7);
  });
  return MINE_PREFIX + base64urlEncode(bytes);
}

export function decodeMine(blob: string, sortedIds: string[]): Set<string> {
  const out = new Set<string>();
  if (!blob.startsWith(MINE_PREFIX)) return out;
  try {
    const bytes = base64urlDecode(blob.slice(MINE_PREFIX.length));
    sortedIds.forEach((id, i) => {
      if ((bytes[i >> 3] ?? 0) & (1 << (i & 7))) out.add(id);
    });
  } catch {
    /* malformed link → drop, don't crash */
  }
  return out;
}

export interface DecodeContext {
  sortedIds: string[];
  validYears: number[];
  validDays: string[];
  validLocations: string[];
  validTopics: string[];
  validEventTypes: string[];
}

const MINE_MODES: MineMode[] = ['off', 'highlight', 'isolate'];

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

  const m = params.get('m');
  if (m && MINE_MODES.includes(m as MineMode)) out.mineMode = m as MineMode;

  const mine = params.get('mine');
  if (mine) out.mine = decodeMine(mine, ctx.sortedIds);

  return out;
}

/** Serialize the shareable parts of state into a hash string (no leading '#'). */
export function encodeHash(state: AppState, sortedIds: string[]): string {
  const p = new URLSearchParams();
  p.set('y', String(state.year));
  p.set('d', state.day);
  if (state.filters.locations.size) p.set('loc', [...state.filters.locations].join(','));
  if (state.filters.topics.size) p.set('topic', [...state.filters.topics].join(','));
  if (state.filters.eventTypes.size) p.set('type', [...state.filters.eventTypes].join(','));
  if (state.filters.hideInvitationOnly) p.set('inv', '1');
  if (state.filters.search) p.set('q', state.filters.search);
  if (state.mineMode !== 'off') p.set('m', state.mineMode);
  if (state.mine.size) p.set('mine', encodeMine(state.mine, sortedIds));
  return p.toString();
}

export function hasHash(): boolean {
  return location.hash.replace(/^#/, '').length > 0;
}
