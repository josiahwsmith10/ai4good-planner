import { html, type TemplateResult } from 'lit-html';
import type { AppState } from '../state/store';
import type { ZurichNow } from '../lib/clock';
import { fromMinutes } from '../lib/time';

/**
 * Departure-board masthead. In isolate mode it reskins to a personal board — the
 * screenshot-ready "come find me" header.
 */
export function Masthead(state: AppState, now: ZurichNow, mineCount: number): TemplateResult {
  const isolate = state.mineMode === 'isolate';
  return html`
    <header class="masthead">
      <div class="masthead__brand">
        ${isolate
          ? html`<span class="masthead__word mono">▌ MY BOARD</span>
              <span class="masthead__sub eyebrow">${mineCount} session${mineCount === 1 ? '' : 's'} · come find me</span>`
          : html`<span class="masthead__word mono">AI·FOR·GOOD</span>
              <span class="masthead__sub eyebrow">Le Grand Horaire · ${state.year}</span>`}
      </div>
      <div class="masthead__clock">
        <span class="masthead__time mono">${fromMinutes(now.minutes)}</span>
        <span class="masthead__tz eyebrow">Geneva</span>
      </div>
    </header>
  `;
}
