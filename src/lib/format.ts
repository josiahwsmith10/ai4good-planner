const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** "2026-07-07" → { dow: "TUE", dom: "07" } for the departure-board day tabs. */
export function dayLabel(date: string): { dow: string; dom: string } {
  const [y, m, d] = date.split('-').map(Number);
  const dow = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { dow, dom: String(d).padStart(2, '0') };
}

/** ISO UTC → "1 Jul 2026, 13:18 UTC" for the staleness stamp. */
export function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(d);
  return `${s} UTC`;
}

export function hoursSince(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : (Date.now() - t) / 3_600_000;
}

// Event type → muted keyline CSS variable (design system).
const TYPE_VAR: Record<string, string> = {
  keynote: '--type-keynote',
  panel: '--type-panel',
  workshop: '--type-workshop',
  training: '--type-training',
  roundtable: '--type-roundtable',
  lunch: '--type-social',
  breakfast: '--type-social',
  'networking reception': '--type-social',
  performance: '--type-social',
};
export function eventTypeVar(types: string[]): string {
  for (const t of types) {
    const v = TYPE_VAR[t.toLowerCase()];
    if (v) return v;
  }
  return '--type-default';
}
