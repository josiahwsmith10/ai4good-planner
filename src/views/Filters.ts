import { html, type TemplateResult } from 'lit-html';
import type { Dataset } from '../data/normalize';
import type { AppState, MineMode } from '../state/store';

export interface FilterHandlers {
  toggleFacet: (kind: 'locations' | 'topics' | 'eventTypes', value: string) => void;
  toggleInvitation: () => void;
  setSearch: (v: string) => void;
  clearFilters: () => void;
  setMineMode: (m: MineMode) => void;
  zoom: (delta: number) => void;
  share: () => void;
}

function Facet(
  label: string,
  kind: 'locations' | 'topics' | 'eventTypes',
  values: string[],
  selected: Set<string>,
  h: FilterHandlers,
): TemplateResult {
  return html`
    <details class="facet">
      <summary class="facet__summary mono">
        ${label}${selected.size ? html`<span class="facet__badge">${selected.size}</span>` : ''}
      </summary>
      <div class="facet__menu">
        ${values.map(
          (v) => html`
            <label class="facet__opt">
              <input
                type="checkbox"
                .checked=${selected.has(v)}
                @change=${() => h.toggleFacet(kind, v)}
              />
              <span>${v}</span>
            </label>
          `,
        )}
      </div>
    </details>
  `;
}

const MINE_MODES: { mode: MineMode; label: string }[] = [
  { mode: 'off', label: 'All' },
  { mode: 'highlight', label: 'Highlight mine' },
  { mode: 'isolate', label: 'Only mine' },
];

export function Filters(dataset: Dataset, state: AppState, h: FilterHandlers): TemplateResult {
  const meta = dataset.data.metadata;
  const f = state.filters;
  const anyFilter =
    f.locations.size || f.topics.size || f.eventTypes.size || f.hideInvitationOnly || f.search;

  return html`
    <div class="filters">
      <input
        class="filters__search mono"
        type="search"
        placeholder="Search title / speaker"
        .value=${f.search}
        aria-label="Search sessions"
        @input=${(e: Event) => h.setSearch((e.target as HTMLInputElement).value)}
      />

      ${Facet('Stage', 'locations', meta.locations, f.locations, h)}
      ${Facet('Topic', 'topics', meta.topics, f.topics, h)}
      ${Facet('Type', 'eventTypes', meta.eventTypes, f.eventTypes, h)}

      <button
        class="toggle toggle--amber ${f.hideInvitationOnly ? 'is-on' : ''}"
        aria-pressed=${f.hideInvitationOnly ? 'true' : 'false'}
        @click=${h.toggleInvitation}
      >
        ✦ Hide invitation only
      </button>

      <div class="minemode" role="group" aria-label="My sessions view">
        ${MINE_MODES.map(
          ({ mode, label }) => html`
            <button
              class="minemode__btn mono ${state.mineMode === mode ? 'is-active' : ''}"
              aria-pressed=${state.mineMode === mode ? 'true' : 'false'}
              @click=${() => h.setMineMode(mode)}
            >
              ${label}
            </button>
          `,
        )}
      </div>

      <div class="zoom" role="group" aria-label="Zoom">
        <button class="zoom__btn mono" aria-label="Zoom out" @click=${() => h.zoom(1 / 1.2)}>
          −
        </button>
        <button class="zoom__btn mono" aria-label="Zoom in" @click=${() => h.zoom(1.2)}>+</button>
      </div>

      <button class="btn btn--share" @click=${h.share}>Copy share link</button>
      ${
        anyFilter
          ? html`<button class="btn btn--ghost" @click=${h.clearFilters}>Clear</button>`
          : ''
      }
    </div>
  `;
}
