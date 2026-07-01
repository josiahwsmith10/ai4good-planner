import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { SummitDataSchema, type SummitData, type SummitEvent } from '../shared/schema';

// Semantic diff of two data files, IGNORING metadata.fetchedAt so an unchanged programme
// never produces a daily no-op commit. Prints a markdown summary and sets GitHub Actions
// outputs (changed / large / removed_vocab) when run in CI.

const COMPARE_FIELDS: (keyof SummitEvent)[] = [
  'title', 'date', 'startTime', 'endTime', 'location', 'eventType',
  'topics', 'speakers', 'invitationOnly', 'url', 'endDate', 'isMultiDay',
];
const LARGE_DIFF_RATIO = 0.4;

function load(path: string): SummitData | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = SummitDataSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function fieldEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  return a === b;
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '∅';
  return String(v);
}

function diffVocab(oldData: SummitData | null, next: SummitData) {
  const keys: (keyof SummitData['metadata'])[] = ['days', 'locations', 'topics', 'eventTypes'];
  const changes: string[] = [];
  let removed = false;
  for (const k of keys) {
    const before = new Set((oldData?.metadata[k] as string[]) ?? []);
    const after = new Set(next.metadata[k] as string[]);
    const added = [...after].filter((x) => !before.has(x));
    const gone = [...before].filter((x) => !after.has(x));
    if (added.length) changes.push(`- **${k}** added: ${added.join(', ')}`);
    if (gone.length) {
      changes.push(`- **${k}** removed: ${gone.join(', ')}`);
      removed = true;
    }
  }
  return { changes, removed };
}

function main(): void {
  const newPath = process.argv[2];
  const oldPath = process.argv[3];
  if (!newPath) {
    console.error('usage: tsx scripts/diff.ts <new.json> [old.json]');
    process.exitCode = 1;
    return;
  }
  const next = load(newPath);
  if (!next) {
    console.error(`diff: could not load/validate new data at ${newPath}`);
    process.exitCode = 1;
    return;
  }
  const prev = oldPath ? load(oldPath) : null;

  const prevMap = new Map((prev?.events ?? []).map((e) => [e.id, e]));
  const nextMap = new Map(next.events.map((e) => [e.id, e]));

  const added = [...nextMap.values()].filter((e) => !prevMap.has(e.id));
  const removed = [...prevMap.values()].filter((e) => !nextMap.has(e.id));
  const changed: { e: SummitEvent; fields: string[]; prev: SummitEvent }[] = [];
  for (const e of nextMap.values()) {
    const before = prevMap.get(e.id);
    if (!before) continue;
    const fields = COMPARE_FIELDS.filter((f) => !fieldEqual(e[f], before[f]));
    if (fields.length) changed.push({ e, fields: fields as string[], prev: before });
  }
  const vocab = diffVocab(prev, next);

  const total = added.length + removed.length + changed.length;
  const isChanged = total > 0 || vocab.changes.length > 0;
  const ratio = next.events.length ? total / next.events.length : 0;
  const isLarge = ratio > LARGE_DIFF_RATIO;

  // Markdown summary (also used as the PR body in CI).
  const lines: string[] = [];
  lines.push(`### Programme data diff`);
  lines.push('');
  if (!isChanged) {
    lines.push('No semantic changes (ignoring the snapshot timestamp).');
  } else {
    if (isLarge) lines.push(`> ⚠️ **LARGE DIFF** — ${(ratio * 100).toFixed(0)}% of events changed. Review carefully.`);
    lines.push(`**${added.length} added · ${removed.length} removed · ${changed.length} changed**`);
    lines.push('');
    if (vocab.changes.length) {
      lines.push('#### Vocabulary');
      lines.push(...vocab.changes);
      lines.push('');
    }
    if (added.length) {
      lines.push('#### Added');
      lines.push(...added.slice(0, 40).map((e) => `- ${e.date} ${e.startTime} · ${e.location ?? '—'} · ${e.title}`));
      if (added.length > 40) lines.push(`- …and ${added.length - 40} more`);
      lines.push('');
    }
    if (removed.length) {
      lines.push('#### Removed');
      lines.push(...removed.slice(0, 40).map((e) => `- ${e.date} ${e.startTime} · ${e.location ?? '—'} · ${e.title}`));
      if (removed.length > 40) lines.push(`- …and ${removed.length - 40} more`);
      lines.push('');
    }
    if (changed.length) {
      lines.push('#### Changed');
      for (const c of changed.slice(0, 40)) {
        lines.push(`- **${c.e.title}**`);
        for (const f of c.fields) {
          lines.push(`  - ${f}: \`${fmt((c.prev as Record<string, unknown>)[f])}\` → \`${fmt((c.e as Record<string, unknown>)[f])}\``);
        }
      }
      if (changed.length > 40) lines.push(`- …and ${changed.length - 40} more`);
      lines.push('');
    }
  }
  const summary = lines.join('\n');
  console.log(summary);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `changed=${isChanged ? 'true' : 'false'}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `large=${isLarge ? 'true' : 'false'}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `removed_vocab=${vocab.removed ? 'true' : 'false'}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
}

main();
