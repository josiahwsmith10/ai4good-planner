import { html, nothing, type TemplateResult } from 'lit-html';
import type { SummitEvent } from '../../shared/schema';
import { dayLabel } from '../lib/format';

export interface DetailHandlers {
  toggleMine: (id: string) => void;
  closeDetail: () => void;
  programmeUrl: string;
}

export function EventDetail(
  e: SummitEvent,
  mine: boolean,
  h: DetailHandlers,
): TemplateResult {
  const { dow, dom } = dayLabel(e.date);
  return html`
    <div
      class="detail"
      @click=${(ev: Event) => {
        if (ev.target === ev.currentTarget) h.closeDetail();
      }}
      @keydown=${(ev: KeyboardEvent) => {
        if (ev.key === 'Escape') h.closeDetail();
      }}
    >
      <div class="detail__card" role="dialog" aria-modal="true" aria-label=${e.title}>
        <button class="detail__close" @click=${h.closeDetail} aria-label="Close">✕</button>
        <div class="eyebrow">
          ${e.eventTypes.join(' · ') || 'Session'}${e.invitationOnly ? ' · Invitation only' : ''}
        </div>
        <h2 class="detail__title">${e.title}</h2>
        <div class="detail__meta mono">
          <div>
            ${dow} ${dom} · ${e.startTime}–${e.endTime}${e.isMultiDay && e.endDate
              ? html` <span class="detail__multi">→ through ${e.endDate}</span>`
              : nothing}
          </div>
          <div>${e.location ?? 'No stage assigned'}</div>
        </div>
        ${e.topics.length
          ? html`<div class="detail__topics">
              ${e.topics.map((t) => html`<span class="chip chip--topic">${t}</span>`)}
            </div>`
          : nothing}
        ${e.speakers ? html`<p class="detail__speakers">${e.speakers}</p>` : nothing}
        <div class="detail__actions">
          <button class="btn ${mine ? 'btn--on' : ''}" @click=${() => h.toggleMine(e.id)}>
            ${mine ? '★ On my board' : '☆ Add to my board'}
          </button>
          <a
            class="btn btn--link"
            href=${e.url ?? h.programmeUrl}
            target="_blank"
            rel="noopener"
          >
            ${e.url ? 'Official page ↗' : 'Official programme ↗'}
          </a>
        </div>
      </div>
    </div>
  `;
}
