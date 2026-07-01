import { writeFileSync, renameSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fetchHtml } from './lib/fetchHtml';
import { parseEvents } from './lib/parseEvents';
import { normalizeEvent } from './lib/normalize';
import { buildEnvelope } from './lib/buildEnvelope';
import { validateData } from './lib/validate';
import { ManifestSchema, type Manifest, type SummitData } from '../shared/schema';

const PROGRAMME_URL = 'https://aiforgood.itu.int/summit26/programme/';
const EVENT_NAME = 'AI for Good Global Summit 2026';
const TIMEZONE = 'Europe/Zurich';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function writeJsonAtomic(path: string, obj: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

function fmtRange(days: string[]): string {
  if (!days.length) return '';
  const first = days[0].split('-');
  const last = days[days.length - 1].split('-');
  const month = MONTHS[Number(last[1]) - 1] ?? '';
  return `${Number(first[2])}–${Number(last[2])} ${month} ${last[0]}`;
}

function updateManifest(manifestPath: string, data: SummitData, outFile: string): void {
  let manifest: Manifest = {
    defaultYear: data.metadata.year,
    generatedAt: new Date().toISOString(),
    years: [],
  };
  if (existsSync(manifestPath)) {
    try {
      const parsed = ManifestSchema.safeParse(JSON.parse(readFileSync(manifestPath, 'utf8')));
      if (parsed.success) manifest = parsed.data;
    } catch {
      /* start fresh on a corrupt manifest */
    }
  }
  const entry = {
    year: data.metadata.year,
    file: basename(outFile),
    label: `Geneva · ${fmtRange(data.metadata.days)}`,
    dates: { start: data.metadata.days[0], end: data.metadata.days[data.metadata.days.length - 1] },
    eventCount: data.metadata.eventCount,
    fetchedAt: data.metadata.fetchedAt,
  };
  const years = manifest.years.filter((y) => y.year !== entry.year);
  years.push(entry);
  years.sort((a, b) => a.year - b.year);
  writeJsonAtomic(manifestPath, {
    defaultYear: Math.max(...years.map((y) => y.year)),
    generatedAt: new Date().toISOString(),
    years,
  } satisfies Manifest);
}

function printSummary(data: SummitData): void {
  const byDay: Record<string, number> = {};
  for (const e of data.events) byDay[e.date] = (byDay[e.date] ?? 0) + 1;
  const invOnly = data.events.filter((e) => e.invitationOnly).length;
  const noLoc = data.events.filter((e) => !e.location).length;
  const noUrl = data.events.filter((e) => !e.url).length;
  console.log(
    `[scrape] ${data.events.length} events · ${data.metadata.locations.length} stages · ` +
      `${data.metadata.topics.length} topics · ${data.metadata.eventTypes.length} types`,
  );
  console.log(
    `[scrape] by day: ${Object.entries(byDay)
      .map(([d, n]) => `${d}=${n}`)
      .join(' ')}`,
  );
  console.log(`[scrape] invitation-only=${invOnly} · no-stage=${noLoc} · no-url=${noUrl}`);
}

async function main(): Promise<void> {
  const year = Number(arg('year') ?? new Date().getFullYear());
  const url = arg('url') ?? PROGRAMME_URL;
  const out = arg('out') ?? `public/data/${year}.json`;
  const dryRun = flag('dry-run');
  const failUnder = Number(arg('fail-under') ?? 250);

  console.log(`[scrape] fetching ${url}`);
  const html = await fetchHtml(url);

  const { events: rawEvents, parseErrors } = parseEvents(html);
  console.log(
    `[scrape] ${rawEvents.length} .event nodes · ${parseErrors.length} data-export parse errors`,
  );

  const normalized = rawEvents
    .map(normalizeEvent)
    .filter((e): e is NonNullable<typeof e> => e !== null);
  const dropped = rawEvents.length - normalized.length;
  if (dropped) console.log(`[scrape] dropped ${dropped} node(s) missing essential fields`);

  const data = buildEnvelope(normalized, {
    year,
    eventName: EVENT_NAME,
    sourceUrl: url,
    fetchedAt: new Date().toISOString(),
    timezone: TIMEZONE,
  });

  validateData(data, rawEvents.length, dropped, { failUnder });
  printSummary(data);

  if (dryRun) {
    console.log('[scrape] dry-run — not writing.');
    return;
  }

  const outPath = resolve(out);
  writeJsonAtomic(outPath, data);
  updateManifest(resolve(dirname(outPath), 'manifest.json'), data, out);
  console.log(`[scrape] wrote ${out} + manifest.json`);
}

main().catch((err) => {
  console.error(`[scrape] FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
