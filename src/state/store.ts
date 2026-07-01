export type MineMode = 'off' | 'highlight' | 'isolate';

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
  mine: Set<string>;
  mineMode: MineMode;
  pxPerMin: number;
}

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

// Toggle helpers that return NEW sets (so setState sees a fresh reference).
export function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
