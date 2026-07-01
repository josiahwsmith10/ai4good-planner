import type { SummitData, SummitEvent } from '../../shared/schema';
import { toMinutes } from '../lib/time';

/** One placement of an event on one day (multi-day events yield several). */
export interface DaySegment {
  event: SummitEvent;
  day: string;
  startMin: number;
  endMin: number;
}

export interface Dataset {
  data: SummitData;
  events: SummitEvent[];
  byId: Map<string, SummitEvent>;
  /** Deterministic id order — the index space for the shareable "mine" bitset. */
  sortedIds: string[];
  segmentsByDay: Map<string, DaySegment[]>;
  locations: string[];
  hasNoStage: boolean;
}

function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  let t = Date.UTC(ys, ms - 1, ds);
  const tEnd = Date.UTC(ye, me - 1, de);
  let guard = 0;
  while (t <= tEnd && guard++ < 400) {
    const d = new Date(t);
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate(),
      ).padStart(2, '0')}`,
    );
    t += 86_400_000;
  }
  return out;
}

export function buildDataset(data: SummitData): Dataset {
  const events = data.events;
  const byId = new Map(events.map((e) => [e.id, e]));
  const sortedIds = events
    .map((e) => e.id)
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));

  const segmentsByDay = new Map<string, DaySegment[]>();
  for (const day of data.metadata.days) segmentsByDay.set(day, []);

  let hasNoStage = false;
  for (const e of events) {
    if (!e.location) hasNoStage = true;
    const startMin = toMinutes(e.startTime);
    let endMin = toMinutes(e.endTime);
    if (endMin < startMin) endMin = 24 * 60; // crosses midnight → clamp to end of day
    else if (endMin === startMin) endMin = Math.min(24 * 60, startMin + 30); // min slot

    const days = e.isMultiDay && e.endDate ? daysBetween(e.date, e.endDate) : [e.date];
    for (const day of days) {
      if (!segmentsByDay.has(day)) segmentsByDay.set(day, []);
      segmentsByDay.get(day)!.push({ event: e, day, startMin, endMin });
    }
  }

  return { data, events, byId, sortedIds, segmentsByDay, locations: data.metadata.locations, hasNoStage };
}
