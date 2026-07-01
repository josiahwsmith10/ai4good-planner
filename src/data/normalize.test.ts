import { describe, it, expect } from 'vitest';
import { buildDataset } from './normalize';
import { toMinutes, fromMinutes } from '../lib/time';
import type { SummitData, SummitEvent } from '../../shared/schema';

function ev(overrides: Partial<SummitEvent>): SummitEvent {
  return {
    id: '1',
    title: 'X',
    date: '2026-07-07',
    startTime: '09:00',
    endTime: '10:00',
    startsAt: '2026-07-07T09:00:00',
    endsAt: '2026-07-07T10:00:00',
    isMultiDay: false,
    endDate: null,
    location: 'Room Q',
    eventType: 'Panel',
    eventTypes: ['Panel'],
    topics: [],
    speakers: null,
    invitationOnly: false,
    url: null,
    ...overrides,
  };
}
function data(events: SummitEvent[], days: string[]): SummitData {
  return {
    metadata: {
      year: 2026,
      eventName: 'T',
      sourceUrl: 'https://example.com/',
      fetchedAt: '2026-07-01T00:00:00Z',
      timezone: 'Europe/Zurich',
      eventCount: events.length,
      schemaVersion: 1,
      days,
      locations: ['Room Q'],
      topics: [],
      eventTypes: ['Panel'],
    },
    events,
  };
}

describe('time helpers', () => {
  it('round-trips HH:mm ↔ minutes', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(fromMinutes(570)).toBe('09:30');
    expect(fromMinutes(toMinutes('00:00'))).toBe('00:00');
  });
});

describe('buildDataset', () => {
  it('expands a multi-day event into one segment per day', () => {
    const e = ev({ id: '7', isMultiDay: true, date: '2026-07-07', endDate: '2026-07-09' });
    const ds = buildDataset(data([e], ['2026-07-07', '2026-07-08', '2026-07-09']));
    expect(ds.segmentsByDay.get('2026-07-07')).toHaveLength(1);
    expect(ds.segmentsByDay.get('2026-07-08')).toHaveLength(1);
    expect(ds.segmentsByDay.get('2026-07-09')).toHaveLength(1);
    // every segment references the same underlying event id
    expect(ds.segmentsByDay.get('2026-07-08')![0].event.id).toBe('7');
  });

  it('flags a "No stage" bucket when an event has no location', () => {
    const ds = buildDataset(data([ev({ location: null })], ['2026-07-07']));
    expect(ds.hasNoStage).toBe(true);
  });

  it('clamps an end-before-start (past-midnight) event to end of day', () => {
    const ds = buildDataset(data([ev({ startTime: '23:30', endTime: '00:30' })], ['2026-07-07']));
    const s = ds.segmentsByDay.get('2026-07-07')![0];
    expect(s.startMin).toBe(23 * 60 + 30);
    expect(s.endMin).toBe(24 * 60);
  });
});
