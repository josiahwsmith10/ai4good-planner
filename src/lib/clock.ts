// Geneva wall-clock helpers. Times in the data are Europe/Zurich local; we compare the
// live "now" against them without ever converting the data to UTC.

export interface ZurichNow {
  date: string; // YYYY-MM-DD
  minutes: number; // minutes since local midnight
}

export function nowInZurich(): ZurichNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0; // some engines emit "24" at midnight
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + Number(get('minute')),
  };
}

/** Tick roughly once a minute; returns an unsubscribe. */
export function startClock(cb: (now: ZurichNow) => void, intervalMs = 30_000): () => void {
  cb(nowInZurich());
  const id = setInterval(() => cb(nowInZurich()), intervalMs);
  return () => clearInterval(id);
}
