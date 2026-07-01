import { html, type TemplateResult } from 'lit-html';
import { dayLabel } from '../lib/format';

export function DayTabs(
  days: string[],
  active: string,
  onSelect: (day: string) => void,
): TemplateResult {
  return html`
    <div class="daytabs" role="tablist" aria-label="Summit days">
      ${days.map((d) => {
        const { dow, dom } = dayLabel(d);
        const selected = d === active;
        return html`
          <button
            role="tab"
            aria-selected=${selected ? 'true' : 'false'}
            class="daytab mono ${selected ? 'is-active' : ''}"
            @click=${() => onSelect(d)}
          >
            <span class="daytab__dow">${dow}</span>
            <span class="daytab__dom">${dom}</span>
          </button>
        `;
      })}
    </div>
  `;
}
