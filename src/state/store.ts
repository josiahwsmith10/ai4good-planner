export interface Filters {
  locations: Set<string>;
  topics: Set<string>;
  eventTypes: Set<string>;
  hideInvitationOnly: boolean;
  search: string;
}

export interface AppState {
  year: number;
  day: string;
  filters: Filters;
  pxPerMin: number; // vertical time scale
  // Per-stage-column width in px, keyed by column key; missing → DEFAULT_COL_WIDTH.
  colWidths: Record<string, number>;
}

export const DEFAULT_PX_PER_MIN = 1.3;
export const DEFAULT_COL_WIDTH = 150;
export const COL_WIDTH_MIN = 96;
export const COL_WIDTH_MAX = 320;

export function emptyFilters(): Filters {
  return {
    locations: new Set(),
    topics: new Set(),
    eventTypes: new Set(),
    hideInvitationOnly: false,
    search: '',
  };
}

type Listener = (s: AppState) => void;

let state: AppState;
const listeners = new Set<Listener>();

export function initStore(initial: AppState): void {
  state = initial;
}

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  for (const l of listeners) l(state);
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Toggle helper for the filter facets — returns a NEW set so setState sees a fresh reference.
export function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
