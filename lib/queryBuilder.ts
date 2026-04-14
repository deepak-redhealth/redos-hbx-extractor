// lib/queryBuilder.ts — Red Health Data Hub Query Builder
// Funnel logic  = creation date (both BigQuery + Snowflake)
// Finance logic = COALESCE(drop_date, FULFILLMENT_FULFILLED_AT_IST) via CTE
//
// The FilterPanel now emits DB-native filter values per dataSource:
//   • redos (BigQuery):  statuses = fulfilled|cancelled|dispatched|draft
//                        ownership = 1P|2P|3P|Alliance
//                        vehicleType = als|bls|ecco|hearse|neonatal
//   • hbx   (Snowflake): statuses = COMPLETED|CANCELLED|DISPATCHED|PENDING|REASSIGNED
//                        ownership = OWNED|SAATHI|NON_SAATHI|ALLIANCE
//                        vehicleType = als|bls|ecco|hearse|neonatal
// Mapping tables below stay backward-compatible with the previous UI values
// (own/sathi/non-sathi/alliance, COMPLETED/CANCELLED/...) so existing saved
// filters / AI-parsed inputs keep working.

import { ColumnDef, COLUMN_SCHEMA, getColumnById } from './columnSchema';
import { ParsedIntent } from './aiParser';
export type DbSource = 'redos' | 'hbx';

export interface UIFilters {
  dateFrom?: string;
  dateTo?: string;
  dateField?: 'creation' | 'fulfillment';
  datePreset?: string;
  status?: string[];
  vehicleType?: string[];
  ownershipType?: string[];
  city?: string[];
  partner?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  isScheduled?: boolean | null;
  specialCategory?: string[];
  excludeFreeTrips?: boolean;
  excludeTestCases?: boolean;
  createdByEmail?: string;
  countOnly?: boolean;
  siteName?: string[];
  orderClassification?: string[];
  department?: string[];
  cityGroup?: string[];
}

export interface QueryBuilderInput {
  selectedColumns: string[];
  uiFilters: UIFilters;
  aiParsed?: ParsedIntent;
  dataSource: DbSource;
  maxRows?: number;
  countOnly?: boolean;
}

export interface BuiltQuery {
  sql: string;
  dataSource: DbSource;
  selectedColumnDefs: ColumnDef[];
  appliedFilters: string[];
  warnings: string[];
  isCountQuery: boolean;
}

// ─── DATABASE ROUTING RULES ──────────────────────────────────────────────────
// BigQuery (RedOS): data available up to Sep 30, 2025
// Snowflake (HBX):  data available from Oct 1, 2025
// Overlap period:   Jul 15, 2025 – Sep 30, 2025 (both available)

export function routeDatabase(from: string, to: string, preferred?: DbSource): DbSource {
  const BQ_CUTOFF     = '2025-09-30';
  const OVERLAP_START = '2025-07-15';
  if (from > BQ_CUTOFF) return 'hbx';
  if (to < OVERLAP_START) return 'redos';
  if (from <= BQ_CUTOFF && to > BQ_CUTOFF) return preferred || 'hbx';
  return preferred || 'hbx';
}

export function getDateRangeWarning(from: string, to: string, source: DbSource): string | null {
  const BQ_CUTOFF = '2025-09-30';
  if (source === 'redos' && from > BQ_CUTOFF)
    return 'BigQuery (RedOS) has no data after Sep 30, 2025. Switch to HBX for this date range.';
  if (source === 'hbx' && to < '2025-07-15')
    return 'Snowflake (HBX) has no data before Jul 15, 2025. Switch to RedOS for this date range.';
  if (from <= BQ_CUTOFF && to > BQ_CUTOFF)
    return 'Date range spans both databases (split at Oct 1, 2025). Results shown from ' + source.toUpperCase() + ' only.';
  return null;
}

// ─── OWNERSHIP MAPPING (backward-compat shims) ───────────────────────────────
// BigQuery (fleet_ownership_type): 1P, 2P, 3P, Alliance
// Snowflake (ASSIGNMENT_PROVIDER_TYPE): OWNED, SAATHI, NON_SAATHI, ALLIANCE

export const OWNERSHIP_TO_BQ: Record<string, string[]> = {
  own: ['1P'], owned: ['1P'], '1p': ['1P'],
  sathi: ['2P'], saathi: ['2P'], '2p': ['2P'],
  'non-sathi': ['3P'], nonsathi: ['3P'], non_saathi: ['3P'], 'non_sathi': ['3P'], '3p': ['3P'],
  alliance: ['Alliance'],
};
export const OWNERSHIP_TO_HBX: Record<string, string[]> = {
  own: ['OWNED'], owned: ['OWNED'], '1p': ['OWNED'],
  sathi: ['SAATHI'], saathi: ['SAATHI'], '2p': ['SAATHI'],
  'non-sathi': ['NON_SAATHI'], nonsathi: ['NON_SAATHI'], non_saathi: ['NON_SAATHI'], 'non_sathi': ['NON_SAATHI'], '3p': ['NON_SAATHI'],
  alliance: ['ALLIANCE'],
};

// ─── STATUS MAPPING (backward-compat shims) ──────────────────────────────────
// BQ native: fulfilled, cancelled, dispatched, draft
// HBX native: COMPLETED, CANCELLED, DISPATCHED, PENDING, REASSIGNED
const BQ_STATUS_MAP: Record<string, string> = {
  COMPLETED: 'fulfilled', FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled', DISPATCHED: 'dispatched',
  ASSIGNED: 'dispatched', PENDING: 'draft', DRAFT: 'draft',
  REASSIGNED: 'dispatched', IN_PROGRESS: 'dispatched',
};

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

function resolveDateRange(filters: UIFilters): { from: string; to: string } {
  if (filters.dateFrom && filters.dateTo) return { from: filters.dateFrom, to: filters.dateTo };
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  switch (filters.datePreset) {
    case 'today':      { const t = fmt(today); return { from: t, to: t }; }
    case 'yesterday':  { const y = new Date(today); y.setDate(y.getDate() - 1); const yt = fmt(y); return { from: yt, to: yt }; }
    case 'last7days':  { const f = new Date(today); f.setDate(f.getDate() - 6); return { from: fmt(f), to: fmt(today) }; }
    case 'last30days': { const f = new Date(today); f.setDate(f.getDate() - 29); return { from: fmt(f), to: fmt(today) }; }
    case 'thismonth':  { const f = new Date(today.getFullYear(), today.getMonth(), 1); return { from: fmt(f), to: fmt(today) }; }
    case 'lastmonth':  { const f = new Date(today.getFullYear(), today.getMonth() - 1, 1); const t = new Date(today.getFullYear(), today.getMonth(), 0); return { from: fmt(f), to: fmt(t) }; }
    default:           { const f = new Date(today); f.setDate(f.getDate() - 6); return { from: fmt(f), to: fmt(today) }; }
  }
}

function getToDate(uiFilters: UIFilters, aiParsed: ParsedIntent | undefined, baseTo: string): string {
  const excludeToday = !!(
    (uiFilters as any)?.dateRange?.excludeToday ||
    (aiParsed?.filters?.dateRange as any)?.excludeToday ||
    (aiParsed as any)?.rawInput?.toLowerCase()?.includes('excluding today') ||
    (aiParsed as any)?.rawInput?.toLowerCase()?.includes('exclude today')
  );
  if (!excludeToday) return baseTo;
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = y.getFullYear() + '-' + pad(y.getMonth() + 1) + '-' + pad(y.getDate());
  return baseTo >= yesterday ? yesterday : baseTo;
}

function getQueryMode(input: QueryBuilderInput): 'detail' | 'summary' | 'count' {
  if (input.countOnly || input.uiFilters.countOnly) return 'count';
  const mode = (input.aiParsed as any)?.queryMode;
  if (mode === 'summary') return 'summary';
  if (mode === 'count' || input.aiParsed?.isCountQuery) return 'count';
  return 'detail';
}

// ─── BIGQUERY (REDOS) QUERY BUILDER ──────────────────────────────────────────

function buildRedosQuery(input: QueryBuilderInput): BuiltQuery {
  const { selectedColumns, uiFilters, aiParsed, maxRows = 50000 } = input;
  const warnings: string[] = [];
  const appliedFilters: string[] = [];
  const intent = aiParsed?.intent || 'auto';
  const queryMode = getQueryMode(input);
  const { from, to: baseTo } = resolveDateRange(uiFilters);
  const to = getToDate(uiFilters, aiParsed, baseTo);
  const dbWarn = getDateRangeWarning(from, to, 'redos');
  if (dbWarn) warnings.push(dbWarn);

  const selectedDefs = selectedColumns
    .map(id => getColumnById(id))
    .filter((c): c is ColumnDef => !!c && (c.source === 'both' || c.source === 'redos'))
    .filter(c => c.redosExpr);

  if (selectedDefs.length === 0 && queryMode === 'detail') {
    warnings.push('No valid RedOS columns selected. Using order_id.');
    selectedDefs.push(COLUMN_SCHEMA.find(c => c.id === 'order_id')!);
  }

  const conditions: string[] = ["fo.order_id NOT IN ('RED_V96L5J4X')"];
  const isFinance = intent === 'finance' || uiFilters.dateField === 'fulfillment';

    const statusInput = uiFilters.status?.length ? uiFilters.status : aiParsed?.filters?.status;
  const bqStatuses = statusInput?.length
    ? [...new Set(statusInput.map((s: string) => (BQ_STATUS_MAP[s.toUpperCase()] || s.toLowerCase()).toLowerCase()))]
    : null;

  if (isFinance) {
    conditions.push("DATE(TIMESTAMP_MILLIS(COALESCE(fo.dispatch_dropped_at, fo.dispatch_fulfilling_at, fo.booking_created_by_epoch)), 'Asia/Kolkata') BETWEEN '" + from + "' AND '" + to + "'");
    if (bqStatuses?.length) {
      conditions.push('LOWER(fo.oms_order_status) IN (' + bqStatuses.map((s: string) => "'" + s + "'").join(', ') + ')');
      appliedFilters.push('Status: ' + statusInput!.join(', '));
    } else {
      conditions.push("LOWER(fo.oms_order_status) NOT IN ('cancelled', 'disputed')");
      appliedFilters.push('Finance: Excl. Cancelled/Disputed');
    }
    appliedFilters.push('Finance Date: ' + from + ' to ' + to);
  } else {
    conditions.push("DATE(TIMESTAMP_MILLIS(fo.booking_created_by_epoch), 'Asia/Kolkata') BETWEEN '" + from + "' AND '" + to + "'");
    appliedFilters.push('Creation Date: ' + from + ' to ' + to);
    if (bqStatuses?.length) {
      conditions.push('LOWER(fo.oms_order_status) IN (' + bqStatuses.map((s: string) => "'" + s + "'").join(', ') + ')');
      appliedFilters.push('Status: ' + statusInput!.join(', '));
    }
  }

  const orderClassBq = uiFilters.orderClassification?.length ? uiFilters.orderClassification : (aiParsed?.filters as any)?.orderClassification;
  if (orderClassBq?.length) {
    conditions.push("fo.order_classification IN (" + orderClassBq.map((c: string) => "'" + c + "'").join(', ') + ")");
    appliedFilters.push('Classification: ' + orderClassBq.join(', '));
  }

  const vehicleTypes = uiFilters.vehicleType?.length ? uiFilters.vehicleType : aiParsed?.filters?.vehicleType;
  if (vehicleTypes?.length) {
    const VEHICLE_BQ_MAP: Record<string, string> = {
      als: 'ALS', bls: 'BLS', ecco: 'ECO', hearse: 'Hearse', neonatal: 'ASTH',
    };
    const vehicleConds = vehicleTypes.map((v: string) => {
      const prefix = VEHICLE_BQ_MAP[v.toLowerCase()] || v.toUpperCase();
      return "fo.fleet_type_sent LIKE '" + prefix + "%'";
    });
    conditions.push('(' + vehicleConds.join(' OR ') + ')');
    appliedFilters.push('Vehicle: ' + vehicleTypes.join(', '));
  }
  const ownershipTypes = uiFilters.ownershipType?.length ? uiFilters.ownershipType : aiParsed?.filters?.ownershipType;
  if (ownershipTypes?.length) {
    const bqOwnership = [...new Set(ownershipTypes.flatMap((o: string) => {
      const key = o.toLowerCase().replace(/\s/g, '');
      const mapped = OWNERSHIP_TO_BQ[key] || OWNERSHIP_TO_BQ[o.toLowerCase()];
      return mapped || [o];
    }))];
    conditions.push('fo.fleet_ownership_type IN (' + bqOwnership.map((o: string) => "'" + o + "'").join(', ') + ')');
    appliedFilters.push('Ownership: ' + ownershipTypes.join(', ') + ' (' + bqOwnership.join('/') + ')');
  }
  const cities = uiFilters.city?.length ? uiFilters.city : aiParsed?.filters?.city;
  if (cities?.length) {
    const CITY_CODE_MAP_R: Record<string, string[]> = {
      hyderabad: ['HYD'], bangalore: ['BLR'], bengaluru: ['BLR'],
      chennai:   ['CHN', 'MAA'], mumbai: ['BOM', 'MUM'],
      delhi:     ['DEL', 'NCR'], pune: ['PNQ'], kolkata: ['CCU'],
      noida:     ['NOI'], gurugram: ['GGN'], gurgaon: ['GGN'],
    };
    const cityVals = [...new Set(cities.flatMap((c: string) => {
      const codes = CITY_CODE_MAP_R[c.toLowerCase()];
      return codes ? codes : [c.toUpperCase()];
    }))];
    conditions.push('UPPER(fo.city) IN (' + cityVals.map(v => "'" + v + "'").join(', ') + ')');
    appliedFilters.push('City: ' + cities.join(', ') + ' (' + cityVals.join('/') + ')');
  }

  // Department filter (BQ)
  if (uiFilters.department?.length) {
    const def = getColumnById('department');
    if (def?.redosExpr) {
      const caseBody = def.redosExpr.replace(/\s+AS\s+department\s*$/i, '').trim();
      const vals = uiFilters.department.map(v => "'" + v.replace(/'/g, "''") + "'").join(', ');
      conditions.push('(' + caseBody + ') IN (' + vals + ')');
      appliedFilters.push('Department: ' + uiFilters.department.join(', '));
    }
  }

  // City Group filter (BQ)
  if (uiFilters.cityGroup?.length) {
    const def = getColumnById('city_group');
    if (def?.redosExpr) {
      const caseBody = def.redosExpr.replace(/\s+AS\s+city_group\s*$/i, '').trim();
      const vals = uiFilters.cityGroup.map(v => "'" + v.replace(/'/g, "''") + "'").join(', ');
      conditions.push('(' + caseBody + ') IN (' + vals + ')');
      appliedFilters.push('City Group: ' + uiFilters.cityGroup.join(', '));
    }
  }  const siteNamesBq = uiFilters.siteName?.length ? uiFilters.siteName : (aiParsed?.filters as any)?.siteName;
  if (siteNamesBq?.length) {
    const resolvedSiteIdsBq = (uiFilters as any).resolvedSiteIds as string[] | undefined;
    if (resolvedSiteIdsBq?.length) {
      conditions.push("fo.reports_order_source_id IN (" + resolvedSiteIdsBq.map((id: string) => "'" + id.replace(/'/g, "''") + "'").join(', ') + ")");
      appliedFilters.push('Site: ' + siteNamesBq.join(', ') + ' (by ID)');
    } else {
      const norm = siteNamesBq.map((s: string) => "'" + s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/'/g, "''") + "'");
      conditions.push("REGEXP_REPLACE(UPPER(fo.reports_order_source_name), r'[^A-Z0-9]', '') IN (" + norm.join(', ') + ")");
      appliedFilters.push('Site: ' + siteNamesBq.join(', ') + ' (by name)');
    }
  }
  if (uiFilters.minRevenue != null) { conditions.push('fo.total_fare >= ' + uiFilters.minRevenue * 100); appliedFilters.push('Min Revenue: ₹' + uiFilters.minRevenue); }
  if (uiFilters.maxRevenue != null) { conditions.push('fo.total_fare <= ' + uiFilters.maxRevenue * 100); appliedFilters.push('Max Revenue: ₹' + uiFilters.maxRevenue); }

  const whereClause = conditions.map(c => '  ' + c).join('\nAND ');

  let selectPart: string;
  let suffix: string;
  if (queryMode === 'summary' || queryMode === 'count') {
    const dateE = "DATE(TIMESTAMP_MILLIS(" + (isFinance ? "COALESCE(fo.dispatch_dropped_at, fo.dispatch_fulfilling_at, fo.booking_created_by_epoch)" : "fo.booking_created_by_epoch") + "), 'Asia/Kolkata')";
    const agg = (aiParsed as any)?.aggregations;
    const dims = agg?.dimensions?.length ? agg.dimensions.map((d: any) => {
      const m: Record<string, string> = { date: dateE, order_date: dateE, city: 'fo.city', vehicle_type: 'fo.fleet_type_sent', partner_name: 'fo.fleet_owner_company_name', ownership_type: 'fo.fleet_ownership_type', status: 'fo.oms_order_status' };
      return m[d.alias] || dateE;
    }) : [dateE];
    const dimLabels = dims.map((d: string, i: number) => '  ' + d + ' AS dim_' + i);
    const raw = (aiParsed as any)?.rawInput?.toLowerCase() || '';
    const metrics = [];
    if (raw.includes('revenue') || raw.includes('amount')) {
      metrics.push('  SUM(ROUND(IFNULL(fo.total_fare, 0)/100, 2)) AS total_revenue_inr');
      metrics.push('  AVG(ROUND(IFNULL(fo.total_fare, 0)/100, 2)) AS avg_revenue_inr');
    }
    metrics.push('  COUNT(DISTINCT fo.order_id) AS order_count');
    selectPart = [...dimLabels, ...metrics].join(',\n');
    suffix = '\nGROUP BY ' + dims.join(', ') + '\nORDER BY ' + dims[0] + ' ASC\nLIMIT 500';
  } else {
    selectPart = selectedDefs.map(c => '  ' + c.redosExpr).join(',\n');
    suffix = '\nLIMIT ' + maxRows;
  }

  const needsStgOrder = selectedDefs.some(c =>
    ['bq_patient_name','bq_attender_name','bq_attender_mobile','bq_patient_mobile',
     'bq_patient_age','bq_patient_gender','bq_caller_mobile'].includes(c.id)
  );
  const needsPaymentCte = selectedDefs.some(c => c.id === 'price_override_comments');

  const paymentCte = needsPaymentCte
    ? ',\npayment_details AS (\n  SELECT order_id,\n    STRING_AGG(COALESCE(JSON_VALUE(p.comment), \'\'), \', \') AS price_override_comments\n  FROM fo_base, UNNEST(paymentUpdationDetails) AS p\n  GROUP BY order_id\n)'
    : '';

  const stgJoin = needsStgOrder
    ? '\nLEFT JOIN `redos-prod.stg_rdp.stg_order` s ON s.order_id = fo.order_id'
    : '';
  const paymentJoin = needsPaymentCte
    ? '\nLEFT JOIN payment_details pd ON pd.order_id = fo.order_id'
    : '';

  const finalSelect = needsPaymentCte
    ? selectPart.replace("STRING_AGG(COALESCE(JSON_VALUE(p.comment), ''), ', ') AS price_override_comments", 'pd.price_override_comments')
    : selectPart;

  const sql = '-- RedOS (BigQuery) — ' + queryMode.toUpperCase() + ' QUERY — Generated by Red Health Data Hub\n' +
    '-- Intent: ' + intent + '\n-- Filters: ' + appliedFilters.length + ' applied\n\n' +
    'WITH fo_base AS (\n  SELECT *\n  FROM `redos-prod.rdp.fact_order`\n  WHERE order_id NOT IN (\'RED_V96L5J4X\')\n),\n' +
    'addon_summary AS (\n  SELECT order_id, SUM(CAST(JSON_EXTRACT_SCALAR(x, \'$.price\') AS INT64)) / 100 AS total_addon_price\n  FROM fo_base, UNNEST(JSON_EXTRACT_ARRAY(addons)) AS x GROUP BY order_id\n)' +
    paymentCte + '\n' +
    'SELECT\n' + finalSelect + '\n\n' +
    'FROM fo_base fo\n' +
    'LEFT JOIN `redos-prod.public.fleet_v2` flt ON flt.id = fo.assigned_fleet_id\n' +
    'LEFT JOIN `redos-prod.public.users_v2` ud ON ud.email = fo.last_dispatched_by_email\n' +
    'LEFT JOIN `redos-prod.public.users_v2` ua ON ua.email = fo.order_attributed_to_email\n' +
    'LEFT JOIN `redos-prod.public.client_v2` c ON c.branch_id = flt.dedicated_to_client_id\n' +
    'LEFT JOIN `redos-prod.rdp.response_metrics` rm ON fo.order_id = rm.order_id\n' +
    'LEFT JOIN addon_summary ON addon_summary.order_id = fo.order_id' +
    stgJoin + paymentJoin + '\n\n' +
    'WHERE\n' + whereClause + suffix;

  return { sql, dataSource: 'redos', selectedColumnDefs: selectedDefs, appliedFilters, warnings, isCountQuery: queryMode !== 'detail' };
}

// ─── SNOWFLAKE (HBX) QUERY BUILDER ───────────────────────────────────────────

function buildHbxQuery(input: QueryBuilderInput): BuiltQuery {
  const { selectedColumns, uiFilters, aiParsed, maxRows = 50000 } = input;
  const warnings: string[] = [];
  const appliedFilters: string[] = [];
  const intent = aiParsed?.intent || 'auto';
  const queryMode = getQueryMode(input);
  const { from, to: baseTo } = resolveDateRange(uiFilters);
  const to = getToDate(uiFilters, aiParsed, baseTo);
  const isFinance = intent === 'finance' || uiFilters.dateField === 'fulfillment';
  const dbWarn = getDateRangeWarning(from, to, 'hbx');
  if (dbWarn) warnings.push(dbWarn);

  const selectedDefs = selectedColumns
    .map(id => getColumnById(id))
    .filter((c): c is ColumnDef => !!c && (c.source === 'both' || c.source === 'hbx'))
    .filter(c => c.hbxExpr);

  if (selectedDefs.length === 0 && queryMode === 'detail') {
    warnings.push('No valid HBX columns selected. Using order_id.');
    selectedDefs.push(COLUMN_SCHEMA.find(c => c.id === 'order_id')!);
  }

  const baseConditions: string[] = ["fo.META_ORG_ID = '14927ff8-a1f6-49ba-abcb-7bb1cf842d52'"];
  baseConditions.push("fo.META_ORDER_STATUS NOT IN ('CANCELLED', 'DISPUTED')");
  baseConditions.push("(fo.META_SPECIAL_CATEGORY IS NULL OR UPPER(fo.META_SPECIAL_CATEGORY) NOT LIKE '%TEST%')");
  appliedFilters.push('Excl. Cancelled/Disputed/Test');

  if (!isFinance) {
    baseConditions.push("DATE(CONVERT_TIMEZONE('UTC','Asia/Kolkata', fo.META_BOOKING_CREATED_AT_TIMESTAMP)) BETWEEN '" + from + "' AND '" + to + "'");
    appliedFilters.push('Creation Date: ' + from + ' to ' + to);
    const statuses = uiFilters.status?.length ? uiFilters.status : aiParsed?.filters?.status;
    if (statuses?.length) {
      const hbxStatuses = [...new Set(statuses.map((s: string) => s.toUpperCase()))];
      baseConditions.push('fo.META_ORDER_STATUS IN (' + hbxStatuses.map((s: string) => "'" + s + "'").join(', ') + ')');
      appliedFilters.push('Status: ' + statuses.join(', '));
    }
  } else {
    appliedFilters.push('Finance Drop Date: ' + from + ' to ' + to);
  }

  const orderClassHbx = uiFilters.orderClassification?.length ? uiFilters.orderClassification : (aiParsed?.filters as any)?.orderClassification;
  if (orderClassHbx?.length) {
    baseConditions.push("fo.META_ORDER_CLASSIFICATION IN (" + orderClassHbx.map((c: string) => "'" + c + "'").join(', ') + ")");
    appliedFilters.push('Classification: ' + orderClassHbx.join(', '));
  }

  const vehicleTypes = uiFilters.vehicleType?.length ? uiFilters.vehicleType : aiParsed?.filters?.vehicleType;
  if (vehicleTypes?.length) {
    const hbxVehicleVals = [...new Set(vehicleTypes.map((v: string) => v.toLowerCase()))];
    baseConditions.push('fo.ASSIGNMENT_AMBULANCE_TYPE IN (' + hbxVehicleVals.map((v: string) => "'" + v + "'").join(', ') + ')');
    appliedFilters.push('Vehicle: ' + vehicleTypes.join(', '));
  }
  const ownershipTypes = uiFilters.ownershipType?.length ? uiFilters.ownershipType : aiParsed?.filters?.ownershipType;
  if (ownershipTypes?.length) {
    const hbxOwnership = [...new Set(ownershipTypes.flatMap((o: string) => {
      const key = o.toLowerCase().replace(/\s/g, '');
      const mapped = OWNERSHIP_TO_HBX[key] || OWNERSHIP_TO_HBX[o.toLowerCase()];
      return mapped || [o];
    }))];
    baseConditions.push('fo.ASSIGNMENT_PROVIDER_TYPE IN (' + hbxOwnership.map((o: string) => "'" + o + "'").join(', ') + ')');
    appliedFilters.push('Ownership: ' + ownershipTypes.join(', ') + ' (' + hbxOwnership.join('/') + ')');
  }
  const cities = uiFilters.city?.length ? uiFilters.city : aiParsed?.filters?.city;
  if (cities?.length) {
    const CITY_CODE_MAP: Record<string, string[]> = {
      hyderabad: ['HYD'], bangalore: ['BLR'], bengaluru: ['BLR'],
      chennai:   ['CHN', 'MAA'], mumbai: ['BOM', 'MUM'],
      delhi:     ['DEL', 'NCR'], pune: ['PNQ', 'PUN'],
      kolkata:   ['CCU', 'KOL'], noida: ['NOI'],
      gurugram:  ['GGN'], gurgaon: ['GGN'],
    };
    const cityVals = [...new Set(cities.flatMap((c: string) => {
      const codes = CITY_CODE_MAP[c.toLowerCase()];
      return codes ? codes : [c.toUpperCase()];
    }))];
    baseConditions.push('UPPER(COALESCE(fo.FULFILLMENT_CITY, fo.META_CITY)) IN (' + cityVals.map(v => "'" + v + "'").join(', ') + ')');
    appliedFilters.push('City: ' + cities.join(', ') + ' (' + cityVals.join('/') + ')');
  }
  const siteNames = uiFilters.siteName?.length ? uiFilters.siteName : (aiParsed?.filters as any)?.siteName;
  const needsSiteJoin = !!(siteNames?.length);
  if (siteNames?.length) {
    const resolvedSiteIdsHbx = (uiFilters as any).resolvedSiteIds as string[] | undefined;
    if (resolvedSiteIdsHbx?.length) {
      baseConditions.push("og.site_id IN (" + resolvedSiteIdsHbx.map((id: string) => "'" + id.replace(/'/g, "''") + "'").join(', ') + ")");
      appliedFilters.push('Site: ' + siteNames.join(', ') + ' (by ID)');
    } else {
      const norm = siteNames.map((s: string) => "'" + s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/'/g, "''") + "'");
      baseConditions.push("REGEXP_REPLACE(UPPER(og.name), '[^A-Z0-9]', '') IN (" + norm.join(', ') + ")");
      appliedFilters.push('Site: ' + siteNames.join(', ') + ' (by name)');
    }
  }
  if (uiFilters.minRevenue != null) { baseConditions.push('fo.PAYMENTS_TOTAL_ORDER_AMOUNT >= ' + uiFilters.minRevenue * 100); appliedFilters.push('Min Revenue: ₹' + uiFilters.minRevenue); }
  if (uiFilters.maxRevenue != null) { baseConditions.push('fo.PAYMENTS_TOTAL_ORDER_AMOUNT <= ' + uiFilters.maxRevenue * 100); appliedFilters.push('Max Revenue: ₹' + uiFilters.maxRevenue); }
  const createdByEmail = uiFilters.createdByEmail ?? (aiParsed as any)?.filters?.createdByEmail;
  if (createdByEmail) {
    baseConditions.push("LOWER(COALESCE(fo.META_BOOKING_CREATED_BY, fo.META_ENQUIRY_CREATED_BY, fo.META_CREATED_BY)) ILIKE '%" + createdByEmail.toLowerCase() + "%'");
    appliedFilters.push('Created By: ' + createdByEmail);
  }

  const needsOrg      = selectedDefs.some(c => ['site_name', 'site_type'].includes(c.id)) || needsSiteJoin;
  const needsVehicle  = selectedDefs.some(c => c.id === 'vehicle_subtype');
  const needsUserBu   = selectedDefs.some(c => ['created_by_role', 'created_by_department'].includes(c.id));
  const optionalJoins: string[] = [];
  if (needsOrg)     optionalJoins.push('LEFT JOIN BLADE.CORE.BLADE_ORGANIZATION_ENTITIES_NEW_FLATTENED og ON fo.META_SITE_ID = og.site_id');
  if (needsVehicle) optionalJoins.push('LEFT JOIN BLADE.CORE.BLADE_VEHICLES_DATA vd ON vd.vehicle_id = fo.ASSIGNMENT_AMBULANCE_ID');
  if (needsUserBu)  optionalJoins.push('LEFT JOIN (\n  SELECT email, user_type, department FROM blade.core.blade_user_entities_parsed\n  QUALIFY ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) = 1\n) bu ON bu.email = fo.META_CREATED_BY');
  const joinsSQL = optionalJoins.length ? '\n' + optionalJoins.join('\n') : '';

  if (isFinance && (queryMode === 'summary' || queryMode === 'count')) {
    const agg = (aiParsed as any)?.aggregations;
    const dimMap: Record<string, string> = {
      date: 'drop_date_ist', order_date: 'drop_date_ist',
      city: "UPPER(COALESCE(FULFILLMENT_CITY, META_CITY))", vehicle_type: 'ASSIGNMENT_AMBULANCE_TYPE',
      partner_name: 'ASSIGNMENT_AMBULANCE_SERVICE_NAME', ownership_type: 'ASSIGNMENT_PROVIDER_TYPE',
      status: 'META_ORDER_STATUS', agent_email: 'COALESCE(META_BOOKING_CREATED_BY, META_ENQUIRY_CREATED_BY, META_CREATED_BY)',
    };
    const dims = agg?.dimensions?.length
      ? agg.dimensions.map((d: any) => dimMap[d.alias] || dimMap[d.label?.toLowerCase()] || 'drop_date_ist')
      : ['drop_date_ist'];

    const revenueExpr = 'CASE WHEN META_IS_FREE_TRIP = TRUE THEN 0 ELSE ROUND(IFNULL(PAYMENTS_TOTAL_ORDER_AMOUNT, 0)/100, 2) END';
    const raw = (aiParsed as any)?.rawInput?.toLowerCase() || '';
    const wantsRevenue = raw.includes('revenue') || raw.includes('amount') || raw.includes('payment') || raw.includes('earning');

    const selectLines = [...dims.map((d: string) => '    ' + d + ' AS ' + d.replace(/[(),' ]/g, '_').replace(/_{2,}/g, '_').toLowerCase().substring(0, 30))];
    if (wantsRevenue) {
      selectLines.push('    SUM(' + revenueExpr + ') AS total_revenue_inr');
      selectLines.push('    AVG(' + revenueExpr + ') AS avg_revenue_inr');
    }
    selectLines.push('    COUNT(DISTINCT META_ORDER_ID) AS order_count');

    const baseWhere = baseConditions.map(c => '        ' + c).join('\n        AND ');
    const groupBy = dims.join(', ');

    const sql =
      '-- HBX (Snowflake) — FINANCE SUMMARY QUERY — Generated by Red Health Data Hub\n' +
      '-- Intent: finance | Date Logic: Finance (drop_date_ist via CTE)\n' +
      '-- Filters: ' + appliedFilters.length + ' applied\n\n' +
      'WITH base AS (\n' +
      '    SELECT\n' +
      '        fo.*,\n' +
      '        COALESCE(\n' +
      "            TO_DATE(CONVERT_TIMEZONE('UTC','Asia/Kolkata', fo.ASSIGNMENT_REACHEDDROPOFFAT_TIMESTAMP)),\n" +
      '            TO_DATE(fo.FULFILLMENT_FULFILLED_AT_IST)\n' +
      '        ) AS drop_date_ist\n' +
      '    FROM Blade.core.red_blade_orders_final fo' + joinsSQL + '\n' +
      '    WHERE\n' +
      '        ' + baseWhere + '\n' +
      ')\n' +
      'SELECT\n' + selectLines.join(',\n') + '\n' +
      'FROM base\n' +
      "WHERE drop_date_ist BETWEEN '" + from + "' AND '" + to + "'\n" +
      'GROUP BY ' + groupBy + '\n' +
      'ORDER BY ' + dims[0] + ' ASC\n' +
      'LIMIT 500';

    return { sql, dataSource: 'hbx', selectedColumnDefs: selectedDefs, appliedFilters, warnings, isCountQuery: true };
  }

  const whereClause = baseConditions.map(c => '  ' + c).join('\nAND ');
  let selectPart: string;
  let limitPart: string;

  if (queryMode === 'summary' || queryMode === 'count') {
    const dateE = "DATE(CONVERT_TIMEZONE('UTC','Asia/Kolkata', fo.META_BOOKING_CREATED_AT_TIMESTAMP))";
    const agg = (aiParsed as any)?.aggregations;
    const dimMap: Record<string, string> = {
      date: dateE, order_date: dateE, city: 'fo.FULFILLMENT_CITY',
      vehicle_type: 'fo.ASSIGNMENT_AMBULANCE_TYPE', partner_name: 'fo.ASSIGNMENT_AMBULANCE_SERVICE_NAME',
      ownership_type: 'fo.ASSIGNMENT_PROVIDER_TYPE', status: 'fo.META_ORDER_STATUS',
    };
    const dims = agg?.dimensions?.length
      ? agg.dimensions.map((d: any) => dimMap[d.alias] || dateE)
      : [dateE];
    const dimLabels = dims.map((d: string, i: number) => '    ' + d + ' AS dim_' + i);
    dimLabels.push('    COUNT(DISTINCT fo.META_ORDER_ID) AS order_count');
    selectPart = dimLabels.join(',\n');
    limitPart = '\nGROUP BY ' + dims.join(', ') + '\nORDER BY ' + dims[0] + ' ASC\nLIMIT 500';
  } else {
    selectPart = selectedDefs.map(c => '    ' + c.hbxExpr).join(',\n');
    limitPart = '\nLIMIT ' + maxRows;
  }

  const sql =
    '-- HBX (Snowflake) — ' + queryMode.toUpperCase() + ' QUERY — Generated by Red Health Data Hub\n' +
    '-- Intent: ' + intent + ' | Date Logic: Funnel (creation)\n' +
    '-- Filters: ' + appliedFilters.length + ' applied\n\n' +
    'SELECT\n' + selectPart + '\n\n' +
    'FROM Blade.core.red_blade_orders_final AS fo' + joinsSQL + '\n\n' +
    'WHERE\n' + whereClause + limitPart;

  return { sql, dataSource: 'hbx', selectedColumnDefs: selectedDefs, appliedFilters, warnings, isCountQuery: queryMode !== 'detail' };
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export function buildQuery(input: QueryBuilderInput): BuiltQuery {
  if (input.aiParsed?.filters) {
    const ai = input.aiParsed.filters;
    if (!input.uiFilters.status?.length && ai.status?.length)               input.uiFilters.status = ai.status;
    if (!input.uiFilters.vehicleType?.length && ai.vehicleType?.length)     input.uiFilters.vehicleType = ai.vehicleType;
    if (!input.uiFilters.ownershipType?.length && ai.ownershipType?.length) input.uiFilters.ownershipType = ai.ownershipType;
    if (!input.uiFilters.city?.length && ai.city?.length)                   input.uiFilters.city = ai.city;
    if (!input.uiFilters.dateFrom && !input.uiFilters.dateTo && ai.dateRange?.preset) {
      input.uiFilters.datePreset = ai.dateRange.preset;
      input.uiFilters.dateField  = ai.dateRange.field;
    }
    if (input.uiFilters.minRevenue == null && ai.minRevenue != null) input.uiFilters.minRevenue = ai.minRevenue;
    if (!input.uiFilters.createdByEmail && (ai as any).createdByEmail) input.uiFilters.createdByEmail = (ai as any).createdByEmail;
  }

  const { from, to } = resolveDateRange(input.uiFilters);
  const autoSource = routeDatabase(from, to, input.aiParsed?.dataSource === 'redos' ? 'redos' : 'hbx');

  if ((input.aiParsed as any)?.dataSource === 'auto') {
    input.dataSource = autoSource;
  }

  if (input.dataSource === 'redos') return buildRedosQuery(input);
  return buildHbxQuery(input);
}