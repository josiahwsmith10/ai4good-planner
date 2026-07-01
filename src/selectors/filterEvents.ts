import type { Dataset, DaySegment } from '../data/normalize';
import type { AppState } from '../state/store';

/**
 * Segments visible on the current day given the filters + mine mode.
 * Filters are AND across categories, OR within a category (mirrors the official facets).
 */
export function visibleSegments(dataset: Dataset, state: AppState): DaySegment[] {
  const segs = dataset.segmentsByDay.get(state.day) ?? [];
  const f = state.filters;
  const q = f.search.trim().toLowerCase();

  return segs.filter(({ event: e }) => {
    if (f.hideInvitationOnly && e.invitationOnly) return false;
    if (state.mineMode === 'isolate' && !state.mine.has(e.id)) return false;
    if (f.locations.size && !(e.location && f.locations.has(e.location))) return false;
    if (f.eventTypes.size && !e.eventTypes.some((t) => f.eventTypes.has(t))) return false;
    if (f.topics.size && !e.topics.some((t) => f.topics.has(t))) return false;
    if (q) {
      const hay = `${e.title} ${e.speakers ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
