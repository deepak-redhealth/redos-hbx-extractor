// lib/sites.ts â€” server-side site registry
// Fetches DISTINCT (id, name) pairs from BigQuery (client_v2) and Snowflake
// (BLADE_ORGANIZATION_ENTITIES_NEW_FLATTENED), merges by normalized name, and
// â€” for BigQuery â€” rolls up branch IDs under their parent client so filtering
// by "Dr. L H Hiranandani Hospital - Mumbai" catches BOTH the branch-level ID
// (MUMH003B001) AND the parent-level ID (MUMH003). Cached 30 min per instance.
//
// Exposes:
//   getSitesCached()                 â€” full list for the UI dropdown
//   resolveSiteIds(names, source)    â€” display names â†’ per-source ID list
//
// ID format assumptions:
//   BQ branch_id: <PARENT>[B<digits>]  e.g. MUMH003 (parent), MUMH003B001 (branch)
//   HBX site_id : UUID                 e.g. d13afb72-8e38-4e96-a753-05eb33004f53

import { executeRedosQuery } from './bigquery';
import { executeHbxQuery } from './snowflake';

export interface SiteEntry {
  displayName: string;
  redosIds: string[]; // all BQ branch_ids under this client family
  hbxIds: string[];   // all HBX site_ids matching by normalized name
}

let CACHE: { data: SiteEntry[]; ts: number } | null = null;
const TTL_MS = 30 * 60 * 1000; // 30 minutes

function normalizeName(n: string): string {
  return (n || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Strip trailing "B<digits>" branch suffix to get the parent client ID.
 *  MUMH003B001 -> MUMH003
 *  MUMH003     -> MUMH003   (already parent, left alone)
 */
function parentClientId(id: string): string {
  return (id || '').toUpperCase().replace(/B\d+$/i, '');
}

async function loadSitesFromBq(): Promise<Array<{ id: string; name: string }>> {
  try {
    const { rows } = await executeRedosQuery(
      'SELECT DISTINCT branch_id, branch_name ' +
      'FROM `redos-prod.public.client_v2` ' +
      'WHERE branch_name IS NOT NULL AND branch_id IS NOT NULL'
    );
    return rows
      .map((r: any) => ({ id: String(r.branch_id), name: String(r.branch_name) }))
      .filter(x => x.id && x.name);
  } catch (e) {
    console.error('[sites] BQ load failed:', e);
    return [];
  }
}

async function loadSitesFromHbx(): Promise<Array<{ id: string; name: string }>> {
  try {
    const { rows } = await executeHbxQuery(
      'SELECT DISTINCT site_id, name ' +
      'FROM BLADE.CORE.BLADE_ORGANIZATION_ENTITIES_NEW_FLATTENED ' +
      'WHERE name IS NOT NULL AND site_id IS NOT NULL'
    );
    return rows
      .map((r: any) => ({
        id: String(r.SITE_ID ?? r.site_id ?? ''),
        name: String(r.NAME ?? r.name ?? ''),
      }))
      .filter(x => x.id && x.name);
  } catch (e) {
    console.error('[sites] HBX load failed:', e);
    return [];
  }
}

export async function getSitesCached(): Promise<SiteEntry[]> {
  if (CACHE && Date.now() - CACHE.ts < TTL_MS) return CACHE.data;

  const [bqList, hbxList] = await Promise.all([loadSitesFromBq(), loadSitesFromHbx()]);

  // ---- 1. Group BQ entries by PARENT client ID ----
  // Each group collects every branch_id (parent + all branches) plus every
  // distinct branch_name we saw, so we can pick the most specific display name.
  const bqGroups = new Map<string, { ids: Set<string>; names: string[] }>();
  for (const { id, name } of bqList) {
    const pk = parentClientId(id);
    if (!pk) continue;
    if (!bqGroups.has(pk)) bqGroups.set(pk, { ids: new Set(), names: [] });
    const g = bqGroups.get(pk)!;
    g.ids.add(id);
    g.names.push(name);
  }

  // ---- 2. Build the merged registry, keyed by normalized display name ----
  const byKey = new Map<string, SiteEntry>();

  for (const { ids, names } of bqGroups.values()) {
    // Prefer the longest name (most specific, e.g. "... - Mumbai" over "...")
    const displayName = names.slice().sort((a, b) => b.length - a.length)[0];
    const key = normalizeName(displayName);
    if (!key) continue;
    const existing = byKey.get(key) || { displayName, redosIds: [], hbxIds: [] };
    existing.redosIds = Array.from(new Set([...existing.redosIds, ...ids]));
    byKey.set(key, existing);
  }

  // ---- 3. Layer in HBX, matching by normalized name ----
  for (const { id, name } of hbxList) {
    const key = normalizeName(name);
    if (!key) continue;
    const existing = byKey.get(key) || { displayName: name, redosIds: [], hbxIds: [] };
    existing.hbxIds = Array.from(new Set([...existing.hbxIds, id]));
    existing.displayName = name; // prefer HBX spelling when both exist
    byKey.set(key, existing);
  }

  const list = Array.from(byKey.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  CACHE = { data: list, ts: Date.now() };
  return list;
}

export async function resolveSiteIds(
  displayNames: string[],
  source: 'redos' | 'hbx'
): Promise<string[]> {
  if (!displayNames?.length) return [];
  const sites = await getSitesCached();
  const byKey = new Map(sites.map(s => [normalizeName(s.displayName), s]));
  const out = new Set<string>();
  for (const name of displayNames) {
    const entry = byKey.get(normalizeName(name));
    if (!entry) continue;
    const ids = source === 'redos' ? entry.redosIds : entry.hbxIds;
    for (const id of ids) out.add(id);
  }
  return Array.from(out);
}