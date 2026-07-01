// Theme preference: a personal display setting (not part of the shareable view),
// so it lives in localStorage rather than the URL hash. "system" follows the OS
// prefers-color-scheme live; "light"/"dark" are explicit overrides.

export type ThemePref = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'lgh-theme';

// Board background per theme — mirrors --board in tokens.css, used for the
// <meta name="theme-color"> that tints mobile browser chrome.
const THEME_COLOR: Record<Theme, string> = {
  dark: '#12181f',
  light: '#eef1f5',
};

const lightQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: light)');

/** Read the saved preference, defaulting to "system" if unset or invalid. */
export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage unavailable (private mode, etc.) — fall through to default */
  }
  return 'system';
}

export function saveThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore — persistence is best-effort */
  }
}

export function systemTheme(): Theme {
  return lightQuery().matches ? 'light' : 'dark';
}

export function resolveTheme(pref: ThemePref): Theme {
  return pref === 'system' ? systemTheme() : pref;
}

/** Apply the resolved theme to <html> and keep the theme-color meta tag in sync. */
export function applyTheme(pref: ThemePref): void {
  const theme = resolveTheme(pref);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

/** Cycle System → Light → Dark → System. */
export function nextThemePref(pref: ThemePref): ThemePref {
  return pref === 'system' ? 'light' : pref === 'light' ? 'dark' : 'system';
}

/** Notify when the OS colour scheme changes (only meaningful while pref is "system"). */
export function onSystemThemeChange(cb: () => void): void {
  lightQuery().addEventListener('change', cb);
}
