import type { SummitEvent, SummitData, Metadata } from '../../shared/schema';
import { SCHEMA_VERSION } from '../../shared/schema';

export interface EnvelopeMeta {
  year: number;
  eventName: string;
  sourceUrl: string;
  fetchedAt: string;
  timezone: string;
}

const uniqSorted = (arr: string[]): string[] =>
  [...new Set(arr)].sort((a, b) => a.localeCompare(b));

/**
 * Assemble the on-disk envelope: deterministic event ordering (clean git diffs) and filter
 * vocabularies derived from the events so the UI can never drift from the data.
 */
export function buildEnvelope(events: SummitEvent[], meta: EnvelopeMeta): SummitData {
  const sorted = [...events].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) ||
      (a.location ?? '~').localeCompare(b.location ?? '~') ||
      a.title.localeCompare(b.title),
  );

  const days = uniqSorted(sorted.map((e) => e.date));
  const locations = uniqSorted(sorted.map((e) => e.location).filter((x): x is string => !!x));
  const topics = uniqSorted(sorted.flatMap((e) => e.topics));
  const eventTypes = uniqSorted(sorted.flatMap((e) => e.eventTypes));

  const metadata: Metadata = {
    year: meta.year,
    eventName: meta.eventName,
    sourceUrl: meta.sourceUrl,
    fetchedAt: meta.fetchedAt,
    timezone: meta.timezone,
    eventCount: sorted.length,
    schemaVersion: SCHEMA_VERSION,
    days,
    locations,
    topics,
    eventTypes,
  };

  return { metadata, events: sorted };
}
