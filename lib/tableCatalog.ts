// lib/tableCatalog.ts
// Complete table catalog for both BigQuery (RedOS) and Snowflake (HBX)
// Used by AI parser to understand what data is available and generate correct JOINs

export type TableDb = 'redos' | 'hbx';
export type TableCategory = 'orders' | 'fleet' | 'users' | 'finance' | 'calls' | 'attendance' | 'analytics' | 'partners' | 'misc';

export interface TableInfo {
  id: string;
  db: TableDb;
  fullName: string;        // Fully qualified table name for SQL
  alias: string;           // Short alias for JOINs
  category: TableCategory;
  description: string;
  joinKey?: string;        // How to join to main orders table
  isCore?: boolean;        // Core tables always available
}

// ─── BIGQUERY (REDOS) TABLES ──────────────────────────────────────────────────
export const REDOS_TABLES: TableInfo[] = [
  // CORE ORDERS
  { id: 'bq_fact_order',        db:'redos', fullName:'`redos-prod.rdp.fact_order`',           alias:'fo',   category:'orders',     description:'Main order/trip fact table — funnel, dispatch, fleet, status', isCore:true },
  { id: 'bq_response_metrics',  db:'redos', fullName:'`redos-prod.rdp.response_metrics`',      alias:'rm',   category:'orders',     description:'Response time metrics — assign to wheel, wheel to pickup, pickup to drop', joinKey:'fo.order_id = rm.order_id', isCore:true },

  // FLEET
  { id: 'bq_fleet_v2',          db:'redos', fullName:'`redos-prod.public.fleet_v2`',           alias:'flt',  category:'fleet',      description:'Fleet/ambulance master data — registration, type, ownership, operator', joinKey:'flt.id = fo.assigned_fleet_id', isCore:true },
  { id: 'bq_fleet_owner_v2',    db:'redos', fullName:'`redos-prod.public.fleet_owner_v2`',     alias:'fo2',  category:'fleet',      description:'Fleet owner/partner details', joinKey:'fo2.id = flt.owner_id' },
  { id: 'bq_fact_fleet_analytics', db:'redos', fullName:'`redos-prod.rdp.fact_fleet_analytics`', alias:'ffa', category:'fleet',    description:'Fleet analytics — utilization, availability, idle time' },
  { id: 'bq_fact_availability', db:'redos', fullName:'`redos-prod.rdp.fact_availability`',     alias:'av',   category:'fleet',      description:'Vehicle availability data by time slot' },
  { id: 'bq_fact_mileage',      db:'redos', fullName:'`redos-prod.rdp.fact_mileage`',          alias:'ml',   category:'fleet',      description:'Vehicle mileage tracking data' },

  // USERS
  { id: 'bq_users_v2',          db:'redos', fullName:'`redos-prod.public.users_v2`',           alias:'ud',   category:'users',      description:'User/agent master — email, role, status', joinKey:'ud.email = fo.last_dispatched_by_email', isCore:true },
  { id: 'bq_entities',          db:'redos', fullName:'`redos-prod.public.entities`',           alias:'ent',  category:'users',      description:'All entity data — pilots, paramedics, agents' },
  { id: 'bq_assignments',       db:'redos', fullName:'`redos-prod.public.assignments`',        alias:'asgn', category:'users',      description:'Staff assignment records' },
  { id: 'bq_user_assignment',   db:'redos', fullName:'`redos-prod.public.user_assignment`',    alias:'ua2',  category:'users',      description:'User to zone/shift assignment' },
  { id: 'bq_attendance',        db:'redos', fullName:'`redos-prod.public.attendance`',         alias:'att',  category:'attendance', description:'Staff attendance records' },
  { id: 'bq_fact_pilot_attendance', db:'redos', fullName:'`redos-prod.rdp.fact_pilot_attendance`', alias:'pa', category:'attendance', description:'Pilot attendance facts' },
  { id: 'bq_fact_pilot_daily',  db:'redos', fullName:'`redos-prod.rdp.fact_pilot_daily`',      alias:'pd',   category:'analytics',  description:'Pilot daily performance metrics' },

  // CLIENTS / PARTNERS
  { id: 'bq_client_v2',         db:'redos', fullName:'`redos-prod.public.client_v2`',          alias:'c',    category:'partners',   description:'Client/hospital master data — name, type, city', joinKey:'c.branch_id = flt.dedicated_to_client_id', isCore:true },
  { id: 'bq_partner_meta',      db:'redos', fullName:'`redos-prod.rdp.Partner_metadata`',      alias:'pm',   category:'partners',   description:'Partner metadata', joinKey:'pm.fleet_owner_id = flt.owner_id' },

  // CALLS
  { id: 'bq_fact_call',         db:'redos', fullName:'`redos-prod.rdp.fact_call`',             alias:'fc',   category:'calls',      description:'Call center call data — inbound/outbound, duration, outcome' },
  { id: 'bq_fact_aom',          db:'redos', fullName:'`redos-prod.rdp.fact_aom`',              alias:'aom',  category:'analytics',  description:'Area operations manager data' },

  // FINANCE
  { id: 'bq_fact_digital_payments', db:'redos', fullName:'`redos-prod.rdp.fact_digital_payments`', alias:'dp', category:'finance', description:'Digital payment transactions' },
  { id: 'bq_redbooks',          db:'redos', fullName:'`redos-prod.public.redbooks`',           alias:'rb',   category:'finance',    description:'Redbooks — partner ledger/passbook' },
  { id: 'bq_redbooks_payment',  db:'redos', fullName:'`redos-prod.public.redbooks_payment`',   alias:'rbp',  category:'finance',    description:'Redbooks payment records' },
  { id: 'bq_razorpay',          db:'redos', fullName:'`redos-prod.public.razorpay_payments`',  alias:'rzp',  category:'finance',    description:'Razorpay payment gateway transactions' },

  // ANALYTICS / REPORTING
  { id: 'bq_dim_date',          db:'redos', fullName:'`redos-prod.rdp.dim_date`',              alias:'dd',   category:'analytics',  description:'Date dimension table' },
  { id: 'bq_fact_audit',        db:'redos', fullName:'`redos-prod.rdp.fact_audit`',            alias:'fau',  category:'analytics',  description:'Audit log facts' },
  { id: 'bq_fact_autodispatch', db:'redos', fullName:'`redos-prod.rdp.fact_autodispatch`',     alias:'fad',  category:'analytics',  description:'Auto-dispatch performance data' },
  { id: 'bq_geofence',          db:'redos', fullName:'`redos-prod.rdp.geofence_table`',        alias:'gf',   category:'analytics',  description:'Geofence zone definitions' },
  { id: 'bq_fact_shift_daily',  db:'redos', fullName:'`redos-prod.rdp.fact_shift_daily`',      alias:'fsd',  category:'attendance', description:'Daily shift data — crew schedule and performance' },
  { id: 'bq_fact_schm',         db:'redos', fullName:'`redos-prod.rdp.fact_schm`',             alias:'fschm',category:'analytics',  description:'SCHM (schedule management) data' },
  { id: 'bq_dispatch_orders',   db:'redos', fullName:'`redos-prod.public.dispatch_orders`',    alias:'dor',  category:'orders',     description:'Dispatch order events' },
  { id: 'bq_order_assignment',  db:'redos', fullName:'`redos-prod.public.order_assignment`',   alias:'oa',   category:'orders',     description:'Order to fleet assignment history', joinKey:'oa.order_id = fo.order_id' },
  { id: 'bq_pilot_swipe',       db:'redos', fullName:'`redos-prod.public.pilot_swipe_data`',   alias:'ps',   category:'analytics',  description:'Pilot GPS swipe/location data' },
  { id: 'bq_saathi_pricing',    db:'redos', fullName:'`redos-prod.public.saathi_pricing`',     alias:'sp',   category:'finance',    description:'Saathi partner pricing configuration' },
  { id: 'bq_shift_type',        db:'redos', fullName:'`redos-prod.public.shift_type`',         alias:'st',   category:'attendance', description:'Shift type master' },
  { id: 'bq_feedback',          db:'redos', fullName:'`redos-prod.public.feedback_sms_responses`', alias:'fb', category:'misc',    description:'Customer feedback SMS responses' },
];

// ─── SNOWFLAKE (HBX) TABLES ───────────────────────────────────────────────────
export const HBX_TABLES: TableInfo[] = [
  // CORE ORDERS
  { id: 'hbx_orders',           db:'hbx', fullName:'BLADE.CORE.RED_BLADE_ORDERS_FINAL',        alias:'fo',   category:'orders',   description:'Main HBX order table — all booking, fulfillment, payment data', isCore:true },
  { id: 'hbx_orders_temp',      db:'hbx', fullName:'BLADE.CORE.RED_BLADE_ORDERS_TEMP',         alias:'fot',  category:'orders',   description:'Temp/staging orders table' },

  // USERS / AGENTS
  { id: 'hbx_users',            db:'hbx', fullName:'BLADE.CORE.BLADE_USER_ENTITIES_PARSED',    alias:'ue',   category:'users',    description:'Agent/user master — email, role, department, designation, supervisor', joinKey:'ue.email = fo.META_CREATED_BY', isCore:true },
  { id: 'hbx_squads',           db:'hbx', fullName:'BLADE.CORE.RED_BLADE_ENTITY_SQUADS_FINAL', alias:'sq',   category:'users',    description:'Entity squad/team assignments' },
  { id: 'hbx_crew_attendance',  db:'hbx', fullName:'BLADE.RAW.RED_BLADE_CREW_ATTENDENCE',      alias:'ca',   category:'attendance', description:'Crew attendance records' },
  { id: 'hbx_shift_assignments',db:'hbx', fullName:'BLADE.RAW.RED_BLADE_SHIFT_ASSIGNMENTS',    alias:'sa',   category:'attendance', description:'Shift assignment data' },
  { id: 'hbx_dashboard_users',  db:'hbx', fullName:'BLADE.CORE.DASHBOARD_USERS',               alias:'du',   category:'users',    description:'Dashboard user access data' },

  // FLEET / VEHICLES
  { id: 'hbx_vehicles',         db:'hbx', fullName:'BLADE.CORE.BLADE_VEHICLES_DATA',           alias:'vd',   category:'fleet',    description:'Vehicle master — model, type, city, 5G flag, assignment type', joinKey:'vd.vehicle_id = fo.ASSIGNMENT_AMBULANCE_ID', isCore:true },
  { id: 'hbx_vehicles_parsed',  db:'hbx', fullName:'BLADE.CORE.BLADE_VEHICLES_PARSED',         alias:'vp',   category:'fleet',    description:'Parsed vehicle data' },
  { id: 'hbx_vehicle_logs',     db:'hbx', fullName:'BLADE.CORE.VEHICLE_LOGS_FINAL',            alias:'vl',   category:'fleet',    description:'Vehicle activity/status logs' },
  { id: 'hbx_fleet_analytics',  db:'hbx', fullName:'BLADE.CORE.FACT_FLEET_ANALYTICS',          alias:'ffa',  category:'fleet',    description:'Fleet analytics — utilization and performance' },

  // CLIENTS / ORGANIZATIONS
  { id: 'hbx_org',              db:'hbx', fullName:'BLADE.CORE.BLADE_ORGANIZATION_ENTITIES_NEW_FLATTENED', alias:'og', category:'partners', description:'Organization/hospital/site master — name, city, type, status', joinKey:'og.site_id = fo.META_SITE_ID', isCore:true },
  { id: 'hbx_org_flat',         db:'hbx', fullName:'BLADE.CORE.BLADE_ORGANIZATION_ENTITIES_FLATTENED', alias:'ogf', category:'partners', description:'Flattened org entities (older version)' },
  { id: 'hbx_client_v2',        db:'hbx', fullName:'BLADE.CORE.CLIENT_V2',                     alias:'cv2',  category:'partners', description:'Client V2 master data' },
  { id: 'hbx_queue_map',        db:'hbx', fullName:'BLADE.CORE.BLADE_QUEUE_CLIENT_MAP',        alias:'qcm',  category:'partners', description:'Queue to client mapping' },

  // FINANCE / TRANSACTIONS
  { id: 'hbx_transactions',     db:'hbx', fullName:'BLADE.RAW.BLADE_TRANSACTIONS_DATA',        alias:'tr',   category:'finance',  description:'All financial transactions — payments, settlements, BTH, wallet', isCore:true },
  { id: 'hbx_accounts',         db:'hbx', fullName:'BLADE.RAW.BLADE_ACCOUNTS_DATA',            alias:'ba',   category:'finance',  description:'Account master — entity type, name, account ID' },
  { id: 'hbx_partner_outstanding', db:'hbx', fullName:'BLADE.RAW.BLADE_PARTNER_OUTSTANDING_LEDGER', alias:'pol', category:'finance', description:'Partner outstanding ledger — unpaid amounts per order' },
  { id: 'hbx_invoices',         db:'hbx', fullName:'BLADE.CORE.BLADE_INVOICE_PARSED',          alias:'inv',  category:'finance',  description:'Parsed invoice data' },
  { id: 'hbx_transactions_parsed', db:'hbx', fullName:'BLADE.CORE.BLADE_TRANSACTIONS_PARSED',  alias:'trp',  category:'finance',  description:'Parsed/enriched transaction data' },
  { id: 'hbx_discount_coupons', db:'hbx', fullName:'BLADE.CORE.RED_BLADE_CUSTOMER_DISCOUNT_COUPONS', alias:'dc', category:'finance', description:'Customer discount coupon records' },

  // CALLS
  { id: 'hbx_fact_call',        db:'hbx', fullName:'BLADE.CORE.FACT_CALL',                     alias:'fcall',category:'calls',    description:'HBX call center data' },
  { id: 'hbx_genesys_calls',    db:'hbx', fullName:'BLADE.RAW.GENESYS_CALLS_RAW',              alias:'gcr',  category:'calls',    description:'Genesys raw call data — IVR, agent calls, hold time' },

  // FEEDBACK
  { id: 'hbx_feedback',         db:'hbx', fullName:'BLADE.RAW.BLADE_FEEDBACK_HUB',             alias:'fbk',  category:'misc',     description:'Customer feedback hub data' },

  // ANALYTICS
  { id: 'hbx_booster',          db:'hbx', fullName:'BLADE.CORE.RED_BLADE_BOOSTER_FINAL',       alias:'bst',  category:'analytics',description:'Booster program data' },
  { id: 'hbx_payments_sqs',     db:'hbx', fullName:'BLADE.RAW.BLADE_PAYMENT_SQS',              alias:'psq',  category:'finance',  description:'Payment SQS queue data' },
];

export const ALL_TABLES = [...REDOS_TABLES, ...HBX_TABLES];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function getTablesForDb(db: TableDb): TableInfo[] {
  return ALL_TABLES.filter(t => t.db === db);
}

export function getCoreTablesForDb(db: TableDb): TableInfo[] {
  return ALL_TABLES.filter(t => t.db === db && t.isCore);
}

export function getTableByCategory(db: TableDb, category: TableCategory): TableInfo[] {
  return ALL_TABLES.filter(t => t.db === db && t.category === category);
}

export function findTableByKeyword(keyword: string, db?: TableDb): TableInfo[] {
  const kw = keyword.toLowerCase();
  return ALL_TABLES.filter(t => {
    if (db && t.db !== db) return false;
    return t.description.toLowerCase().includes(kw) ||
           t.fullName.toLowerCase().includes(kw) ||
           t.id.toLowerCase().includes(kw) ||
           t.category === kw;
  });
}

// Category descriptions for AI prompt
export const TABLE_CATEGORIES: Record<TableCategory, string> = {
  orders:     'Trip/order data — booking, dispatch, fulfillment, cancellation',
  fleet:      'Vehicle/ambulance data — registration, type, availability, mileage',
  users:      'Agent/pilot/crew data — roles, departments, assignments',
  finance:    'Billing/payment data — transactions, invoices, outstanding, wallet',
  calls:      'Call center data — inbound/outbound calls, IVR, agent performance',
  attendance: 'Crew attendance, shifts, scheduling',
  analytics:  'Pre-built analytics facts — daily aggregates, KPIs, audit',
  partners:   'Client/hospital/organization data — site details, configurations',
  misc:       'Feedback, coupons, miscellaneous data',
};
