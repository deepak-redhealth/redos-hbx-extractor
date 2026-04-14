// lib/sites.ts — server-side site registry
// Fetches DISTINCT (id, name) pairs from both BigQuery (client_v2) and Snowflake
// (BLADE_ORGANIZATION_ENTITIES_NEW_FLATTENED), merges by normalized name, caches
// in-memory per Lambda instance (30 min TTL).

import { executeRedosQuery } from './bigquery';
import { executeHbxQuery } from './snowflake';
export interface SiteEntry {
  displayName: string;
  redosId?: string;
  hbxId?: string;
}

let CACHE: { data: SiteEntry[]; ts: number } | null = null;
const TTL_MS = 30 * 60 * 1000;

function normalizeName(n: string): string {
  return (n || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
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
  } catch (e) { console.error('[sites] BQ load failed:', e); return []; }
}

async function loadSitesFromHbx(): Promise<Array<{ id: string; name: string }>> {
  try {
    const { rows } = await executeHbxQuery(
      'SELECT DISTINCT site_id, name ' +
      'FROM BLADE.CORE.BLADE_ORGANIZATION_ENTITIES_NEW_FLATTENED ' +
      'WHERE name IS NOT NULL AND site_id IS NOT NULL'
    );
    return rows
      .map((r: any) => ({ id: String(r.SITE_ID ?? r.site_id ?? ''), name: String(r.NAME ?? r.name ?? '') }))
      .filter(x => x.id && x.name);
  } catch (e) { console.error('[sites] HBX load failed:', e); return []; }
}

export async function getSitesCached(): Promise<SiteEntry[]> {
  if (CACHE && Date.now() - CACHE.ts < TTL_MS) return CACHE.data;
  const [bqList, hbxList] = await Promise.all([loadSitesFromBq(), loadSitesFromHbx()]);
  const byKey = new Map<string, SiteEntry>();
  for (const { id, name } of bqList) {
    const key = normalizeName(name); if (!key) continue;
    const existing = byKey.get(key) || { displayName: name };
    existing.redosId = id; byKey.set(key, existing);
  }
  for (const { id, name } of hbxList) {
    const key = normalizeName(name); if (!key) continue;
    const existing = byKey.get(key) || { displayName: name };
    existing.hbxId = id; existing.displayName = name; byKey.set(key, existing);
  }
  const list = Array.from(byKey.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  CACHE = { data: list, ts: Date.now() };
  return list;
}

export async function resolveSiteIds(displayNames: string[], source: 'redos' | 'hbx'): Promise<string[]> {
  if (!displayNames?.length) return [];
  const sites = await getSitesCached();
  const byKey = new Map(sites.map(s => [normalizeName(s.displayName), s]));
  const ids: string[] = [];
  for (const name of displayNames) {
    const entry = byKey.get(normalizeName(name));
    if (!entry) continue;
    const id = source === 'redos' ? entry.redosId : entry.hbxId;
    if (id) ids.push(id);
  }
  return ids;
}
