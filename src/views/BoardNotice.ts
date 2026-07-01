import { html, type TemplateResult } from 'lit-html';
import type { Metadata } from '../../shared/schema';
import { formatStamp, hoursSince } from '../lib/format';

/** Unofficial / staleness board-notice strip. Turns to a warning when data looks stale. */
export function BoardNotice(meta: Metadata): TemplateResult {
  const stale = hoursSince(meta.fetchedAt) > 48;
  return html`
    <div class="notice ${stale ? 'notice--warn' : ''}" role="note">
      <span class="notice__tag eyebrow">Unofficial</span>
      <span class="notice__body">
        Snapshot as of <span class="mono">${formatStamp(meta.fetchedAt)}</span>. Not affiliated with
        the ITU — verify the
        <a href=${meta.sourceUrl} target="_blank" rel="noopener">official programme ↗</a>.
      </span>
      ${stale ? html`<span class="notice__flag eyebrow">data may be stale</span>` : ''}
    </div>
  `;
}
