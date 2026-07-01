import { html, nothing, type TemplateResult } from 'lit-html';
import { fromMinutes } from '../../lib/time';
import { eventTypeVar } from '../../lib/format';
import type { GridLayout, PlacedBlock } from '../../selectors/layoutGrid';
import type { AppState } from '../../state/store';
import type { ZurichNow } from '../../lib/clock';
import type { SummitEvent } from '../../../shared/schema';

export interface GridHandlers {
  toggleMine: (id: string) => void;
  open: (id: string) => void;
}

function blockAria(e: SummitEvent): string {
  return [
    e.eventTypes.join('/') || 'Session',
    e.location ?? 'no stage',
    `${e.startTime} to ${e.endTime}`,
    e.title,
    e.invitationOnly ? 'invitation only' : '',
  ]
    .filter(Boolean)
    .join(', ');
}

function EventBlock(b: PlacedBlock, state: AppState, h: GridHandlers): TemplateResult {
  const e = b.seg.event;
  const mine = state.mine.has(e.id);
  const dim = state.mineMode === 'highlight' && !mine;
  const leftPct = (b.lane / b.laneCount) * 100;
  const widthPct = 100 / b.laneCount;
  const cls = `ev${mine ? ' ev--mine' : ''}${dim ? ' ev--dim' : ''}${e.invitationOnly ? ' ev--inv' : ''}`;
  return html`
    <article
      class=${cls}
      style="top:${b.top}px;height:${b.height}px;left:${leftPct}%;width:calc(${widthPct}% - 4px);--kl:var(${eventTypeVar(
        e.eventTypes,
      )})"
      tabindex="0"
      role="button"
      aria-label=${blockAria(e)}
      @click=${() => h.open(e.id)}
      @keydown=${(ev: KeyboardEvent) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          h.open(e.id);
        }
      }}
    >
      <div class="ev__row mono">
        <span class="ev__time">${e.startTime}–${e.endTime}</span>
        ${e.invitationOnly ? html`<span class="ev__inv" title="Invitation only">✦</span>` : nothing}
      </div>
      <div class="ev__title">${e.title}</div>
      <button
        class="ev__star ${mine ? 'is-on' : ''}"
        aria-pressed=${mine ? 'true' : 'false'}
        title=${mine ? 'Remove from my board' : 'Add to my board'}
        @click=${(ev: Event) => {
          ev.stopPropagation();
          h.toggleMine(e.id);
        }}
      >
        ${mine ? '★' : '☆'}
      </button>
    </article>
  `;
}

/**
 * The board: stages across (only those with sessions), time down. Absolute blocks driven by
 * one shared px/min; sticky stage headers + time ruler; a live rose "now" line on today.
 */
export function GridView(
  layout: GridLayout,
  state: AppState,
  now: ZurichNow,
  h: GridHandlers,
): TemplateResult {
  if (!layout.columns.length) {
    return html`<div class="board-empty mono">No sessions match — adjust the filters.</div>`;
  }
  const cols = layout.columns;
  const gridCols = `var(--ruler-w) repeat(${cols.length}, var(--col-w))`;
  const showNow =
    state.day === now.date && now.minutes >= layout.startMin && now.minutes <= layout.endMin;
  const nowTop = (now.minutes - layout.startMin) * state.pxPerMin;

  return html`
    <div class="board">
      <div class="board__inner" style="--grid-cols:${gridCols}">
        <div class="heads">
          <div class="corner mono">${cols.reduce((n, c) => n + c.count, 0)}</div>
          ${cols.map(
            (c) => html`
              <div class="stagehead" title=${c.label}>
                <span class="stagehead__name">${c.label}</span>
                <span class="stagehead__count mono">${c.count}</span>
              </div>
            `,
          )}
        </div>
        <div class="plot" style="height:${layout.height}px">
          <div class="ruler">
            ${layout.hourTicks.map(
              (t) => html`
                <div class="ruler__tick mono" style="top:${(t - layout.startMin) * state.pxPerMin}px">
                  ${fromMinutes(t)}
                </div>
              `,
            )}
          </div>
          ${layout.hourTicks.map(
            (t) => html`<div class="hourline" style="top:${(t - layout.startMin) * state.pxPerMin}px"></div>`,
          )}
          ${cols.map(
            (c) => html`<div class="col">${c.blocks.map((b) => EventBlock(b, state, h))}</div>`,
          )}
          ${showNow
            ? html`<div class="nowline" style="top:${nowTop}px">
                <span class="nowline__label mono">${fromMinutes(now.minutes)}</span>
              </div>`
            : nothing}
        </div>
      </div>
    </div>
  `;
}
