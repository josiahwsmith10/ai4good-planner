import { html, nothing, type TemplateResult } from 'lit-html';
import type { Manifest } from '../../shared/schema';

/** Renders only when more than one year exists — the evergreen year switch, data-driven. */
export function YearSwitcher(
  manifest: Manifest,
  activeYear: number,
  onSelect: (year: number) => void,
): TemplateResult | typeof nothing {
  if (manifest.years.length <= 1) return nothing;
  return html`
    <label class="yearswitch mono">
      <span class="eyebrow">Year</span>
      <select @change=${(e: Event) => onSelect(Number((e.target as HTMLSelectElement).value))}>
        ${manifest.years.map(
          (y) =>
            html`<option value=${y.year} ?selected=${y.year === activeYear}>${y.year}</option>`,
        )}
      </select>
    </label>
  `;
}
