import { z } from 'zod';

// Single source of truth for the on-disk data contract. Both the scraper (Node) and the
// front-end (browser) import these schemas; TS types are inferred so the two can never drift.

export const SCHEMA_VERSION = 1;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'expected HH:mm');
const isoLocalDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, 'expected YYYY-MM-DDTHH:mm:ss');

export const EventSchema = z.object({
  /** WordPress post id, as a string — stable primary key across refreshes. */
  id: z.string().min(1),
  title: z.string().min(1),
  date: isoDate,
  startTime: hhmm,
  endTime: hhmm,
  /** ISO local datetime (no offset) — for sorting and overlap math only. */
  startsAt: isoLocalDateTime,
  endsAt: isoLocalDateTime,
  isMultiDay: z.boolean(),
  /** End date when the event spans multiple days, else null. */
  endDate: isoDate.nullable(),
  /** Stage / room. null when the source gives no location. */
  location: z.string().nullable(),
  /** Raw source event-type string (kept for the chip label). */
  eventType: z.string(),
  /** Normalized array — combos like "Keynote,Panel" split; used for filtering + keyline. */
  eventTypes: z.array(z.string()),
  topics: z.array(z.string()),
  speakers: z.string().nullable(),
  invitationOnly: z.boolean(),
  /** Canonical official event page, or null (then the UI falls back to the programme view). */
  url: z.string().url().nullable(),
});
export type SummitEvent = z.infer<typeof EventSchema>;

export const MetadataSchema = z.object({
  year: z.number().int(),
  eventName: z.string(),
  sourceUrl: z.string().url(),
  /** ISO-8601 UTC scrape time — surfaced in the UI as the staleness stamp. */
  fetchedAt: z.string(),
  /** IANA tz of the start/end wall-clock times. Never convert; just label. */
  timezone: z.string(),
  eventCount: z.number().int().nonnegative(),
  schemaVersion: z.number().int(),
  // Filter vocabularies, derived from the events so the UI can't drift from the data.
  days: z.array(isoDate),
  locations: z.array(z.string()),
  topics: z.array(z.string()),
  eventTypes: z.array(z.string()),
});
export type Metadata = z.infer<typeof MetadataSchema>;

export const SummitDataSchema = z
  .object({
    metadata: MetadataSchema,
    events: z.array(EventSchema),
  })
  .refine((d) => d.metadata.eventCount === d.events.length, {
    message: 'metadata.eventCount must equal events.length',
    path: ['metadata', 'eventCount'],
  });
export type SummitData = z.infer<typeof SummitDataSchema>;

export const ManifestYearSchema = z.object({
  year: z.number().int(),
  file: z.string(),
  label: z.string(),
  dates: z.object({ start: isoDate, end: isoDate }),
  eventCount: z.number().int(),
  fetchedAt: z.string(),
});
export type ManifestYear = z.infer<typeof ManifestYearSchema>;

export const ManifestSchema = z.object({
  defaultYear: z.number().int(),
  generatedAt: z.string(),
  years: z.array(ManifestYearSchema),
});
export type Manifest = z.infer<typeof ManifestSchema>;
