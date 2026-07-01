import { parse, type HTMLElement } from 'node-html-parser';

// Shape of the JSON embedded in each event's data-export attribute (source-native keys).
export interface RawExport {
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  topic?: string;
  event_type?: string;
  speakers?: string;
  invitation_only?: boolean | string | number;
}

export interface RawEvent {
  postId: string | null;
  dataValue: string | null; // start date, e.g. "2026-07-07"
  dataEnddate: string | null; // end date (differs from start for multi-day events)
  exported: RawExport | null; // parsed data-export JSON
  canonicalUrl: string | null; // official event page
  topicPills: string[]; // richer than exported.topic; primary topic source
}

export interface ParseResult {
  events: RawEvent[];
  parseErrors: { index: number; reason: string }[];
}

const ENTITY: Record<string, string> = {
  '&quot;': '"',
  '&#34;': '"',
  '&#039;': "'",
  '&#39;': "'",
  '&apos;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
};
function decodeEntities(s: string): string {
  return s.replace(/&quot;|&#34;|&#0?39;|&apos;|&amp;|&lt;|&gt;/g, (m) => ENTITY[m] ?? m);
}
function tryJson(raw: string | undefined): RawExport | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RawExport;
  } catch {
    try {
      return JSON.parse(decodeEntities(raw)) as RawExport;
    } catch {
      return null;
    }
  }
}

/**
 * Parse the server-rendered programme HTML into raw per-event records.
 * All source-structure knowledge (selectors, attribute names) lives here, so a future
 * site change is a one-file fix.
 */
export function parseEvents(html: string): ParseResult {
  const root = parse(html);
  const nodes = root.querySelectorAll('.event');
  const events: RawEvent[] = [];
  const parseErrors: { index: number; reason: string }[] = [];

  nodes.forEach((node: HTMLElement, index: number) => {
    const idAttr = node.getAttribute('id') ?? '';
    const idMatch = idAttr.match(/^eventid-(\d+)$/);
    const postId = idMatch ? idMatch[1] : null;

    const exported = tryJson(node.getAttribute('data-export'));
    if (!exported)
      parseErrors.push({ index, reason: `data-export parse failed (id=${idAttr || '?'})` });

    const anchor =
      node.querySelector('.event-title h2 a') ?? node.querySelector('a[href*="/event/"]');
    const canonicalUrl = anchor?.getAttribute('href') ?? null;

    const topicPills = node
      .querySelectorAll('[data-field="topics_tags"]')
      .map((el) => (el.getAttribute('data-value') ?? '').trim())
      .filter(Boolean);

    events.push({
      postId,
      dataValue: node.getAttribute('data-value') ?? null,
      dataEnddate: node.getAttribute('data-enddate') ?? null,
      exported,
      canonicalUrl,
      topicPills,
    });
  });

  return { events, parseErrors };
}
