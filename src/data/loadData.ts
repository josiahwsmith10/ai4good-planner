import {
  ManifestSchema,
  SummitDataSchema,
  type Manifest,
  type SummitData,
} from '../../shared/schema';

// All data paths resolve through Vite's BASE_URL so dev ("/") and the Pages project site
// ("/ai4good-planner/") both work. Never hard-code the base.
const BASE = import.meta.env.BASE_URL;

export async function loadManifest(): Promise<Manifest> {
  const res = await fetch(`${BASE}data/manifest.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load manifest (${res.status})`);
  return ManifestSchema.parse(await res.json());
}

export async function loadYear(file: string): Promise<SummitData> {
  const res = await fetch(`${BASE}data/${file}`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${file} (${res.status})`);
  return SummitDataSchema.parse(await res.json());
}
