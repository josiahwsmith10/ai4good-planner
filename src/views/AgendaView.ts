import { html, nothing, type TemplateResult } from 'lit-html';
import type { DaySegment } from '../data/normalize';
import type { AppState } from '../state/store';
import { eventTypeVar } from '../lib/format';
import type { GridHandlers } from './grid/GridView';

/**
 * Narrow-screen fallback in the same board voice: a time-ordered "departures" list with a
 * conflict badge when sessions run in parallel. Better than a 20-column grid on a phone.
 */
export function AgendaView(
  segments: DaySegment[],
  state: AppState,
  h: GridHandlers,
): TemplateResult {
  if (!segments.length) {
    return html`<div class="board-empty mono">No sessions match — adjust the filters.</div>`;
  }
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  return html`
    <div class="agenda">
      ${sorted.map((s) => {
        const e = s.event;
        const mine = state.mine.has(e.id);
        const dim = state.mineMode === 'highlight' && !mine;
        const parallel = sorted.filter(
          (o) => o !== s && o.startMin < s.endMin && s.startMin < o.endMin,
        ).length;
        return html`
          <div
            class="agenda__row ${mine ? 'is-mine' : ''} ${dim ? 'is-dim' : ''}"
            style="--kl:var(${eventTypeVar(e.eventTypes)})"
          >
            <div class="agenda__time mono">
              <span>${e.startTime}</span><span class="agenda__end">${e.endTime}</span>
            </div>
            <div class="agenda__main">
              <div class="agenda__meta mono">
                ${e.location ?? 'No stage'} · ${e.eventTypes.join('/') || 'Session'}${e.invitationOnly
                  ? html` · <span class="agenda__inv">✦ inv</span>`
                  : nothing}${parallel
                  ? html` · <span class="agenda__clash">⚠ ${parallel} parallel</span>`
                  : nothing}
              </div>
              <button class="agenda__title" @click=${() => h.open(e.id)}>${e.title}</button>
            </div>
            <button
              class="agenda__star ${mine ? 'is-on' : ''}"
              aria-pressed=${mine ? 'true' : 'false'}
              title=${mine ? 'Remove from my board' : 'Add to my board'}
              @click=${() => h.toggleMine(e.id)}
            >
              ${mine ? '★' : '☆'}
            </button>
          </div>
        `;
      })}
    </div>
  `;
}
