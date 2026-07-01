import type { RawEvent } from './parseEvents';
import type { SummitEvent } from '../../shared/schema';

function clean(s: unknown): string {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '';
}
function coerceBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
  return false;
}
// Split combo values on [ ; , | ] — never on "&", which appears inside real names
// like "AI & the future of work".
function splitList(s: string): string[] {
  return s
    .split(/[;,|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}
const uniq = (arr: string[]): string[] => [...new Set(arr)];

/**
 * Map a raw event to the clean schema. Returns null when the essential fields are missing
 * (the caller's sanity gates fail the run if too many drop).
 */
export function normalizeEvent(raw: RawEvent): SummitEvent | null {
  const ex = raw.exported;
  if (!ex) return null;

  const id = raw.postId ?? '';
  const title = clean(ex.title);
  const date = clean(ex.date);
  const startTime = clean(ex.start_time);
  const endTimeRaw = clean(ex.end_time);
  const endTime = endTimeRaw || startTime;
  if (!id || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
    return null;
  }

  const locationRaw = clean(ex.location);
  const location = locationRaw === '' ? null : locationRaw;

  const eventType = clean(ex.event_type);
  const eventTypes = uniq(splitList(eventType));

  const pillTopics = uniq(raw.topicPills.map(clean).filter(Boolean));
  const topics = pillTopics.length ? pillTopics : uniq(splitList(clean(ex.topic)));

  const speakersRaw = clean(ex.speakers);
  const speakers = speakersRaw === '' ? null : speakersRaw;

  const invitationOnly = coerceBool(ex.invitation_only);

  const endDateRaw = clean(raw.dataEnddate);
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(endDateRaw) && endDateRaw !== date ? endDateRaw : null;
  const isMultiDay = endDate !== null;

  const url = raw.canonicalUrl && /^https?:\/\//.test(raw.canonicalUrl) ? raw.canonicalUrl : null;

  return {
    id,
    title,
    date,
    startTime,
    endTime,
    startsAt: `${date}T${startTime}:00`,
    endsAt: `${date}T${endTime}:00`,
    isMultiDay,
    endDate,
    location,
    eventType,
    eventTypes,
    topics,
    speakers,
    invitationOnly,
    url,
  };
}
