// "mine" is persisted per year so switching years keeps each year's picks separate.
const key = (year: number) => `ai4good:mine:${year}`;

export function loadMine(year: number): Set<string> {
  try {
    const raw = localStorage.getItem(key(year));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveMine(year: number, mine: Set<string>): void {
  try {
    localStorage.setItem(key(year), JSON.stringify([...mine]));
  } catch {
    /* private mode / quota — non-fatal */
  }
}
