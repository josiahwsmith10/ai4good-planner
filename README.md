# AI for Good 2026 planner: ["Le Grand Horaire"](https://josiahwsmith10.github.io/ai4good-planner/)

An **unofficial**, personal time-grid / conflict view for the
[AI for Good Global Summit 2026](https://aiforgood.itu.int/summit26/programme/)
(Palexpo, Geneva · 7–10 July 2026). It renders every session on a two-axis board —
stages across, time down — so overlapping sessions are obvious at a glance, with filters
for day, stage, topic and event type.

> **Unofficial and not affiliated with the ITU.** This is a personal tool that mirrors a
> snapshot of the official programme. Always verify against the
> [official programme](https://aiforgood.itu.int/summit26/programme/).

## Stack

- **Front-end:** Vite + vanilla TypeScript + lit-html (no framework). Deployed as a static
  GitHub Pages project site.
- **Data:** a Node/TS scraper reads the server-rendered programme HTML and emits
  `public/data/<year>.json`, validated against a shared `zod` schema (`shared/schema.ts`).
- **Refresh:** a scheduled GitHub Action re-scrapes daily and opens a pull request when the
  programme changes (small, safe diffs auto-merge).

## Develop

```sh
nvm use            # Node 22 (see .nvmrc)
npm install
npm run scrape     # fetch the programme → public/data/2026.json  (+ manifest.json)
npm run dev        # Vite dev server
npm run build      # typecheck + production build → dist/
npm test           # Vitest (layout, normalize, url-state)
```

`npm run scrape:dry` fetches and reports counts without writing. A scrape that returns zero
events (or fewer than a floor) fails without overwriting the committed data.

## Data model

See `shared/schema.ts`. The envelope is evergreen — the year is data, not code, so a future
year is another `public/data/<year>.json` file plus one `manifest.json` entry.
