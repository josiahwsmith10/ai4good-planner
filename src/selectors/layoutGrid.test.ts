import { describe, it, expect } from 'vitest';
import { layoutGrid, NO_STAGE_LABEL } from './layoutGrid';
import type { DaySegment } from '../data/normalize';
import type { SummitEvent } from '../../shared/schema';

function ev(id: string, location: string | null): SummitEvent {
  return {
    id,
    title: `Event ${id}`,
    date: '2026-07-07',
    startTime: '09:00',
    endTime: '10:00',
    startsAt: '2026-07-07T09:00:00',
    endsAt: '2026-07-07T10:00:00',
    isMultiDay: false,
    endDate: null,
    location,
    eventType: 'Panel',
    eventTypes: ['Panel'],
    topics: [],
    speakers: null,
    invitationOnly: false,
    url: null,
  };
}
const seg = (id: string, loc: string | null, startMin: number, endMin: number): DaySegment => ({
  event: ev(id, loc),
  day: '2026-07-07',
  startMin,
  endMin,
});

describe('layoutGrid', () => {
  it('places two overlapping same-stage events in separate lanes at half width', () => {
    const segs = [seg('a', 'Room Q', 540, 600), seg('b', 'Room Q', 570, 630)];
    const { columns } = layoutGrid(segs, ['Room Q'], 1);
    const blocks = columns[0].blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.laneCount === 2)).toBe(true);
    expect(new Set(blocks.map((b) => b.lane))).toEqual(new Set([0, 1]));
  });

  it('gives non-overlapping events in the same stage full width (laneCount 1)', () => {
    const segs = [seg('a', 'Room Q', 540, 600), seg('b', 'Room Q', 600, 660)];
    const { columns } = layoutGrid(segs, ['Room Q'], 1);
    expect(columns[0].blocks.every((b) => b.laneCount === 1)).toBe(true);
  });

  it('computes laneCount per overlap cluster, not globally', () => {
    // cluster 1: a,b overlap (2 lanes); gap; cluster 2: c alone (1 lane)
    const segs = [
      seg('a', 'Room Q', 540, 600),
      seg('b', 'Room Q', 550, 610),
      seg('c', 'Room Q', 700, 760),
    ];
    const { columns } = layoutGrid(segs, ['Room Q'], 1);
    const byId = new Map(columns[0].blocks.map((b) => [b.seg.event.id, b]));
    expect(byId.get('a')!.laneCount).toBe(2);
    expect(byId.get('b')!.laneCount).toBe(2);
    expect(byId.get('c')!.laneCount).toBe(1);
  });

  it('routes null-location events into a trailing "No stage" column', () => {
    const segs = [seg('a', 'Room Q', 540, 600), seg('b', null, 540, 600)];
    const { columns } = layoutGrid(segs, ['Room Q'], 1);
    expect(columns.map((c) => c.label)).toEqual(['Room Q', NO_STAGE_LABEL]);
  });

  it('derives the day window from visible segments, snapped to the hour', () => {
    const segs = [seg('a', 'Room Q', 9 * 60 + 30, 10 * 60 + 15)];
    const { startMin, endMin } = layoutGrid(segs, ['Room Q'], 1);
    expect(startMin).toBe(9 * 60); // floored to 09:00
    expect(endMin).toBe(11 * 60); // min 2h window
  });

  it('only includes stages that actually have sessions', () => {
    const segs = [seg('a', 'Room Q', 540, 600)];
    const { columns } = layoutGrid(segs, ['Centre stage', 'Room Q', 'Room R'], 1);
    expect(columns.map((c) => c.key)).toEqual(['Room Q']);
  });
});
