import { html, type TemplateResult } from 'lit-html';
import { nextThemePref, type ThemePref } from '../lib/theme';

interface ThemeHandlers {
  cycleTheme: () => void;
}

const LABEL: Record<ThemePref, { icon: string; text: string }> = {
  system: { icon: '◐', text: 'System' },
  light: { icon: '☀', text: 'Light' },
  dark: { icon: '☾', text: 'Dark' },
};

/** Controls-row button that cycles System → Light → Dark → System. */
export function ThemeToggle(pref: ThemePref, h: ThemeHandlers): TemplateResult {
  const { icon, text } = LABEL[pref];
  const next = LABEL[nextThemePref(pref)].text;
  return html`
    <button
      class="btn btn--ghost themetoggle"
      @click=${h.cycleTheme}
      title="Theme: ${text} — click to switch to ${next}"
      aria-label="Theme: ${text}. Click to switch to ${next}."
    >
      ${icon} Theme: ${text}
    </button>
  `;
}
