// Self-hosted fonts (no CDN) — only the weights the design system uses.
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans-condensed/500.css';

import './styles/tokens.css';
import './styles/type.css';
import './styles/app.css';
import './styles/board.css';

import type { Manifest, SummitData } from '../shared/schema';
import { loadManifest, loadYear } from './data/loadData';
import { buildDataset } from './data/normalize';
import { initStore, getState, setState, emptyFilters, type AppState } from './state/store';
import { decodeHash, hasHash } from './state/urlState';
import { loadMine } from './state/persistence';
import { nowInZurich } from './lib/clock';
import { mountApp, setDataset } from './app';

let manifest: Manifest;

function defaultDay(days: string[]): string {
  const today = nowInZurich().date;
  return days.includes(today) ? today : (days[0] ?? today);
}

function initialState(data: SummitData): AppState {
  const meta = data.metadata;
  const dataset = buildDataset(data);
  const base: AppState = {
    year: meta.year,
    day: defaultDay(meta.days),
    filters: emptyFilters(),
    mine: loadMine(meta.year),
    mineMode: 'off',
    pxPerMin: 1.3,
  };
  // A shared link (hash) wins over local defaults so it reproduces exactly.
  if (hasHash()) {
    const patch = decodeHash(location.hash, {
      sortedIds: dataset.sortedIds,
      validYears: manifest.years.map((y) => y.year),
      validDays: meta.days,
      validLocations: meta.locations,
      validTopics: meta.topics,
      validEventTypes: meta.eventTypes,
    });
    Object.assign(base, patch);
  }
  return base;
}

async function switchYear(year: number): Promise<void> {
  const entry = manifest.years.find((y) => y.year === year);
  if (!entry) return;
  const data = await loadYear(entry.file);
  setDataset(buildDataset(data));
  setState({
    year,
    day: defaultDay(data.metadata.days),
    filters: emptyFilters(),
    mine: loadMine(year),
    mineMode: 'off',
  });
}

function renderError(app: HTMLElement, err: unknown): void {
  app.innerHTML = `
    <div class="fatal">
      <div class="eyebrow">Le Grand Horaire</div>
      <p>Couldn't load the programme data.</p>
      <p class="mono fatal__msg">${String(err instanceof Error ? err.message : err)}</p>
      <p class="mono">Run <code>npm run scrape</code> to generate <code>public/data/2026.json</code>.</p>
    </div>`;
}

async function boot(): Promise<void> {
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) return;
  try {
    manifest = await loadManifest();
    const wantYear = (() => {
      const m = location.hash.match(/(?:^|[#&])y=(\d+)/);
      const y = m ? Number(m[1]) : NaN;
      return manifest.years.some((e) => e.year === y) ? y : manifest.defaultYear;
    })();
    const entry =
      manifest.years.find((y) => y.year === wantYear) ??
      manifest.years.find((y) => y.year === manifest.defaultYear) ??
      manifest.years[0];
    const data = await loadYear(entry.file);

    initStore(initialState(data));
    mountApp(app, buildDataset(data), manifest, { onYearChange: switchYear });
  } catch (err) {
    renderError(app, err);
  }
}

void boot();
