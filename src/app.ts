import { html, nothing, render } from 'lit-html';
import type { Manifest } from '../shared/schema';
import type { Dataset } from './data/normalize';
import {
  getState,
  setState,
  subscribe,
  emptyFilters,
  toggleInSet,
  COL_WIDTH_MAX,
  COL_WIDTH_MIN,
  DEFAULT_COL_WIDTH,
} from './state/store';
import { visibleSegments } from './selectors/filterEvents';
import { layoutGrid } from './selectors/layoutGrid';
import { encodeHash } from './state/urlState';
import { startClock, nowInZurich, type ZurichNow } from './lib/clock';
import { Masthead } from './views/Masthead';
import { BoardNotice } from './views/BoardNotice';
import { DayTabs } from './views/DayTabs';
import { Filters } from './views/Filters';
import { YearSwitcher } from './views/YearSwitcher';
import { GridView } from './views/grid/GridView';
import { AgendaView } from './views/AgendaView';
import { EventDetail } from './views/EventDetail';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

let root: HTMLElement;
let dataset: Dataset;
let manifest: Manifest;
let now: ZurichNow = nowInZurich();
let selectedId: string | null = null;
let onYearChange: (year: number) => void = () => {};
// Ordered keys of the currently-rendered board columns — used by the live column resize.
let liveColKeys: string[] = [];

// View: auto (agenda on phones, board otherwise) unless the user overrides.
const narrow = window.matchMedia('(max-width: 700px)');
let viewOverride: 'board' | 'agenda' | null = null;
let firstPaint = true;
function effectiveView(): 'board' | 'agenda' {
  return viewOverride ?? (narrow.matches ? 'agenda' : 'board');
}

let rafId = 0;
function scheduleRender(): void {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    rerender();
  });
}

let urlTimer = 0;
function syncUrl(): void {
  clearTimeout(urlTimer);
  urlTimer = window.setTimeout(() => {
    const hash = encodeHash(getState());
    const url = hash ? `#${hash}` : `${location.pathname}${location.search}`;
    history.replaceState(null, '', url);
  }, 250);
}

let toastTimer = 0;
function toast(msg: string): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 2200);
}

const handlers = {
  selectDay: (day: string) => {
    setState({ day });
    selectedId = null;
    syncUrl();
  },
  toggleFacet: (kind: 'locations' | 'topics' | 'eventTypes', value: string) => {
    setState((s) => ({ filters: { ...s.filters, [kind]: toggleInSet(s.filters[kind], value) } }));
    syncUrl();
  },
  toggleInvitation: () => {
    setState((s) => ({
      filters: { ...s.filters, hideInvitationOnly: !s.filters.hideInvitationOnly },
    }));
    syncUrl();
  },
  setSearch: (v: string) => {
    setState((s) => ({ filters: { ...s.filters, search: v } }));
    syncUrl();
  },
  clearFilters: () => {
    setState({ filters: emptyFilters() });
    syncUrl();
  },
  zoom: (delta: number) => {
    setState((s) => ({ pxPerMin: clamp(s.pxPerMin * delta, 0.5, 4) }));
  },
  // Excel-style column resize: drag the stage header's right edge. During the drag we set
  // the grid template directly on the DOM (blocks are %-width, so they scale for free), then
  // commit the final width to state on release for one clean re-render.
  startResize: (key: string, e: PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = getState().colWidths[key] ?? DEFAULT_COL_WIDTH;
    const boardInner = root.querySelector<HTMLElement>('.board__inner');
    let liveW = startW;
    const template = (w: number) =>
      `var(--ruler-w) ${liveColKeys
        .map((k) => `${k === key ? w : (getState().colWidths[k] ?? DEFAULT_COL_WIDTH)}px`)
        .join(' ')}`;
    const onMove = (ev: PointerEvent) => {
      liveW = clamp(startW + (ev.clientX - startX), COL_WIDTH_MIN, COL_WIDTH_MAX);
      boardInner?.style.setProperty('--grid-cols', template(liveW));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('is-col-resizing');
      setState((s) => ({ colWidths: { ...s.colWidths, [key]: liveW } }));
    };
    document.body.classList.add('is-col-resizing');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  },
  open: (id: string) => {
    selectedId = id;
    scheduleRender();
  },
  closeDetail: () => {
    selectedId = null;
    scheduleRender();
  },
  share: async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast('View link copied');
    } catch {
      toast('Copy failed — select the address bar');
    }
  },
  selectYear: (y: number) => onYearChange(y),
  toggleView: () => {
    viewOverride = effectiveView() === 'board' ? 'agenda' : 'board';
    scheduleRender();
  },
  get programmeUrl() {
    return dataset.data.metadata.sourceUrl;
  },
};

function rerender(): void {
  const state = getState();
  const segs = visibleSegments(dataset, state);
  const view = effectiveView();
  const selected = selectedId ? (dataset.byId.get(selectedId) ?? null) : null;
  const enter = firstPaint;
  firstPaint = false;

  let body;
  if (view === 'agenda') {
    liveColKeys = [];
    body = AgendaView(segs, handlers);
  } else {
    const layout = layoutGrid(segs, dataset.locations, state.pxPerMin);
    liveColKeys = layout.columns.map((c) => c.key);
    body = GridView(layout, state, now, handlers);
  }

  render(
    html`
      ${Masthead(state, now)} ${BoardNotice(dataset.data.metadata)}
      <div class="controls">
        ${YearSwitcher(manifest, state.year, handlers.selectYear)}
        ${DayTabs(dataset.data.metadata.days, state.day, handlers.selectDay)}
        ${Filters(dataset, state, handlers)}
        <button class="btn btn--ghost viewtoggle" @click=${handlers.toggleView}>
          ${view === 'board' ? '☰ Agenda' : '▦ Board'}
        </button>
      </div>
      <main class="board-wrap ${enter ? 'is-enter' : ''}">${body}</main>
      ${
        selected
          ? EventDetail(selected, {
              closeDetail: handlers.closeDetail,
              programmeUrl: handlers.programmeUrl,
            })
          : nothing
      }
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
    `,
    root,
  );
}

export function setDataset(ds: Dataset): void {
  dataset = ds;
  selectedId = null;
}

export function mountApp(
  el: HTMLElement,
  ds: Dataset,
  mf: Manifest,
  opts: { onYearChange: (y: number) => void },
): void {
  root = el;
  dataset = ds;
  manifest = mf;
  onYearChange = opts.onYearChange;
  subscribe(() => scheduleRender());
  startClock((n) => {
    now = n;
    scheduleRender();
  });
  narrow.addEventListener('change', () => scheduleRender());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selectedId) handlers.closeDetail();
  });
  rerender();
}
