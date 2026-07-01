import { html, type TemplateResult } from 'lit-html';
import type { AppState } from '../state/store';
import type { ZurichNow } from '../lib/clock';
import { fromMinutes } from '../lib/time';

/** Departure-board masthead: wordmark + live Geneva clock. */
export function Masthead(state: AppState, now: ZurichNow): TemplateResult {
  return html`
    <header class="masthead">
      <div class="masthead__brand">
        <span class="masthead__word mono">AI·FOR·GOOD</span>
        <span class="masthead__sub eyebrow">Le Grand Horaire · ${state.year}</span>
      </div>
      <div class="masthead__clock">
        <span class="masthead__time mono">${fromMinutes(now.minutes)}</span>
        <span class="masthead__tz eyebrow">Geneva</span>
      </div>
    </header>
  `;
}
