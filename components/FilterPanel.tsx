'use client';
// components/FilterPanel.tsx
// Source-aware filter panel — renders BigQuery (REDos) or Snowflake (HBX)
// native values based on the selected data source.

import { useEffect, useState } from 'react';
import styles from './FilterPanel.module.css';

export type DbSource = 'redos' | 'hbx';

interface Props {
  filters: any;
  onChange: (f: any) => void;
  /** Which DB the user is querying. Drives which native values / labels are shown. */
  dataSource: DbSource;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-source filter configuration
// The `value` is the DB-native value sent to the query builder (no mapping needed).
// The `label` is what the user sees.
// ─────────────────────────────────────────────────────────────────────────────

interface Opt { value: string; label: string; }

interface SourceConfig {
  title: string;        // Shown in section headers, e.g. "REDos" / "HBX"
  badge: string;        // Shown next to titles, e.g. "BigQuery" / "Snowflake"
  statuses: Opt[];
  vehicleTypes: Opt[];
  ownership: Opt[];
  orderClassification: Opt[];
}

const SOURCE_CONFIG: Record<DbSource, SourceConfig> = {
  redos: {
    title: 'REDos',
    badge: 'BigQuery',
    // BQ (fact_order.oms_order_status) lowercase native values
    statuses: [
      { value: 'fulfilled',  label: 'Fulfilled (Completed)' },
      { value: 'cancelled',  label: 'Cancelled' },
      { value: 'dispatched', label: 'Dispatched' },
      { value: 'draft',      label: 'Draft (Pending)' },
    ],
    // BQ fleet_type_sent — LIKE prefix match handled in queryBuilder
    vehicleTypes: [
      { value: 'als',      label: 'ALS (ALS-*)' },
      { value: 'bls',      label: 'BLS (BLS-*)' },
      { value: 'ecco',     label: 'ECO' },
      { value: 'hearse',   label: 'Hearse' },
      { value: 'neonatal', label: 'Neonatal (ASTH-*)' },
    ],
    // BQ fleet_ownership_type native values
    ownership: [
      { value: '1P',       label: 'Own (1P)' },
      { value: '2P',       label: 'Sathi (2P)' },
      { value: '3P',       label: 'Non-Sathi (3P)' },
      { value: 'Alliance', label: 'Alliance' },
    ],
    orderClassification: [
      { value: 'INBOUND',           label: 'Inbound' },
      { value: 'OUTBOUND',          label: 'Outbound' },
      { value: 'TRANSFER',          label: 'Transfer' },
      { value: 'INTERNAL_TRANSFER', label: 'Internal Transfer' },
      { value: 'LAMA/DAMA',         label: 'LAMA / DAMA' },
    ],
  },
  hbx: {
    title: 'HBX',
    badge: 'Snowflake',
    // HBX (META_ORDER_STATUS) uppercase native values
    statuses: [
      { value: 'COMPLETED',  label: 'Completed' },
      { value: 'CANCELLED',  label: 'Cancelled' },
      { value: 'DISPATCHED', label: 'Dispatched' },
      { value: 'PENDING',    label: 'Pending' },
      { value: 'REASSIGNED', label: 'Reassigned' },
    ],
    // HBX ASSIGNMENT_AMBULANCE_TYPE — stored lowercase
    vehicleTypes: [
      { value: 'als',      label: 'ALS' },
      { value: 'bls',      label: 'BLS' },
      { value: 'ecco',     label: 'ECO' },
      { value: 'hearse',   label: 'Hearse' },
      { value: 'neonatal', label: 'Neonatal' },
    ],
    // HBX ASSIGNMENT_PROVIDER_TYPE native values
    ownership: [
      { value: 'OWNED',      label: 'Own (OWNED)' },
      { value: 'SAATHI',     label: 'Sathi (SAATHI)' },
      { value: 'NON_SAATHI', label: 'Non-Sathi (NON_SAATHI)' },
      { value: 'ALLIANCE',   label: 'Alliance' },
    ],
    orderClassification: [
      { value: 'INBOUND',           label: 'Inbound' },
      { value: 'OUTBOUND',          label: 'Outbound' },
      { value: 'TRANSFER',          label: 'Transfer' },
      { value: 'INTERNAL_TRANSFER', label: 'Internal Transfer' },
      { value: 'LAMA/DAMA',         label: 'LAMA / DAMA' },
    ],
  },
};

// Shared (same for both DBs — codes / full names are normalized in queryBuilder)
const DATE_PRESETS = [
  { value: 'today',      label: 'Today' },
  { value: 'yesterday',  label: 'Yesterday' },
  { value: 'last7days',  label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thismonth',  label: 'This Month' },
  { value: 'lastmonth',  label: 'Last Month' },
  { value: 'custom',     label: 'Custom Range' },
];

const CITIES = ['Hyderabad', 'Kolkata', 'Bangalore', 'Indore', 'Kanpur', 'Delhi', 'Ahmedabad', 'Bhubaneswar', 'Noida', 'Gurugram', 'Chennai', 'Guwahati', 'Mumbai', 'Patna', 'Lucknow', 'Mohali', 'Raipur', 'Faridabad', 'Rourkela', 'Ranchi', 'Ghaziabad', 'Bilaspur', 'Jaipur', 'Nagpur', 'Siliguri', 'Panchkula', 'Visakhapatnam', 'Pune', 'Kannur', 'Gulbarga'];
const DEPARTMENTS = ['Digital', 'Hospital', 'Field Sales', 'Corporate and Others', 'Test Cases'];
const CITY_GROUPS = ['DIGITAL', 'CHN', 'DLH-NCR', 'Tri-City', 'MUM'];

// All active hospitals/sites from BQ order_source_name (10+ fulfilled orders)
const SITES = [
  '911 Brand Number',
  'AIG - Gachibowli',
  'APOLLO RAJSHREE - Indore',
  'Aditiya Birla Pune',
  'Anvayaa Kincare Pvt. Ltd.',
  'Apollo Excelcare Hospital',
  'Apollo Hospital - Ahmedabad',
  'Apollo Hospital - BG Road',
  'Apollo Hospital - Jubilee Hills',
  'Apollo Hospital - Navi Mumbai',
  'Apollo Hospitals Enterprise Limited Bilaspur',
  'Apollo Hospitals Enterprise Limited-Rourkela',
  'Apollo Spectra - Ameerpet',
  'Apollo Spectra Hospital- Patna',
  'Aster Prime Hospital - Ameerpet',
  'BM Birla Heart Research Centre',
  'Basaveshwara Teaching and General Hospital',
  'Basvatarakam Hospital',
  'Belenus Champion Hospital',
  'Bharat Hospital',
  'Bombay Hospital- Indore',
  'Brahmananda Narayana Multispeciality Hospital - Jamshedpur',
  'CARE Hospital (OP) - Banjara Hills',
  'CARE Hospital - Banjara Hills',
  'CARE Hospital - HiTech City',
  'CARE Hospital - Malakpet',
  'CARE Hospital - Musheerabad',
  'CARE Hospital - Nampally',
  'CARE Hospital Indore',
  'CIMS Ahmedabad',
  'Care Hospitals - BBSR',
  'Choithram Hospital & Research Centre - Indore',
  'Desun Hospital- Kolkata',
  'Desun Hospital- Siliguri',
  'Deutsche Bank',
  'Dharamshila Narayana Superspeciality Hospital',
  'Dr Rela Institute and Medical Center- Main Unit',
  'Dr Rela- Red Hills',
  'Dr. L H Hiranandani Hospital - Mumbai',
  'Field Sales - Chennai',
  'Field Sales - Indore',
  'Field Sales - Kanpur',
  'Field Sales - Lucknow',
  'Field Sales - Mumbai',
  'Field Sales - Pune',
  'Field Sales - Raipur',
  'Fortis Escorts Heart Institute - Okhla',
  'Fortis Escorts Hospital, Faridabad',
  'Fortis Hospital - Bannerghatta Road',
  'Fortis Hospital - Cunningham Road',
  'Fortis Hospital - Kolkata',
  'Fortis Hospital Manesar',
  'Fortis Hospital Noida',
  'Fortis Hospital, Shalimar Bagh',
  'Fortis Hospital- Jaipur',
  'Fortis Hospital- Mahim',
  'Fortis Hospital-Hills,Mohali',
  'Fortis Hospital-Plain,Mohali',
  'Fortis Hospitals Limited, Fortis Flt. Lt. Rajan Dhall Hospital',
  'Fortis La Femme, Greater Kailash II',
  'Fortis Memorial Research Institute',
  'Fortis Vashi',
  'Gleneagles Global Hospital- Lakdikapul',
  'HCG Hospital',
  'HP Ghosh Hospital - Kolkata',
  'Hi-Tech Medical College and Hospital - Bhubaneswar',
  'Interglobe Aviation Limited',
  'Jiva Rehab',
  'KD Hospital',
  'KIMS - Kondapur',
  'KIMS - Secunderabad',
  'KIMS Kanur',
  'KIMS Kollam',
  'KIMS Nagpur',
  'KIMS Sunshine - Gachibowli',
  'KIMS Sunshine - Secunderabad',
  'KIMS visakhapatnam',
  'Kalinga Hospital - Bhubaneshwar',
  'Kalinga Institute of Medical Sciences (KIMS) - Bhubaneswar',
  'Kamineni Hospital - LB Nagar',
  'Kokilaben Dhirubhai Ambani Hospital',
  'Livasa Hospital- Amritsar',
  'Livasa Hospital- Mohali Hills',
  'Livasa Hospital- Mohali Plains',
  'Malla Reddy Narayana Hospital',
  'Manipal Hospital - Ghaziabad',
  'Marengo Asia Healthcare Private Limited',
  'Mazumdar Shaw Medical Center - Bangalore',
  'Medanta DLF',
  'Medanta Hospital- Lucknow',
  'Medanta Hospital- Patna',
  'Medicover-Mumbai',
  'Medicover-Pune',
  'Medway Hospital (Dedicated)- Chengelpet',
  'Medway Hospital (Dedicated)- Chennai',
  'Medway Hospital (LAMA/DAMA/DB)- Chengelpet',
  'Medway Hospital (LAMA/DAMA/DB)- Chennai',
  'Medway Hospital (dedicated)- Kumbakonam',
  'Medway Hospital (dedicated)- Villupuram',
  'Meridian Medical Research & Hospital Ltd (Multispeciality )',
  'Meridian Medical Research & Hospital Ltd (Superspeciality)',
  'NH HSR',
  'NH MMI Raipur',
  'NH On Call - Inbound',
  'NH Rabindranath Tagore International Institute Of Cardiac Sciences',
  'Narayana Hrudayalaya Ltd',
  'Narayana Institute of Cardiac Sciences',
  'Narayana Multispeciality Hospital - Ahmedabad',
  'Narayana Multispeciality Hospital- Barasat',
  'Narayana Superspeciality Hospital, Guwahati',
  'Neotia Hospital- Siliguri',
  'Niva Bupa Health Insurance',
  'OPCH Hospital- Lucknow',
  'Omega Hospital - Banjara Hills',
  'Omega Hospital - Gachibowli',
  'Paras Hospital - Gurgaon',
  'Paras Hospital - Patna',
  'Paras Hospital - Ranchi',
  'Paras Hospital- Kanpur',
  'Paras Hospital- Panchkula',
  'Paras Hospital-Panchkula- Hills',
  'Princess Durru Shehvar Childrens and General Hospital',
  'QRG Hospital Faridabad',
  'REDOS',
  'Ram Krishna Care Hospital Raipur',
  'Red Health',
  'Red Health- AMD',
  'Red Health- Bangalore',
  'Red Health- Bhubaneswar',
  'Red Health- Chennai',
  'Red Health- Delhi NCR',
  'Red Health- Hyderabad',
  'Red Health- Indore',
  'Red Health- Kanpur',
  'Red Health- Lucknow',
  'Red Health- Mumbai',
  'Red Health- Nagpur',
  'Red Health- Pune',
  'Red Health- Raipur',
  'Red Health-Bilaspur',
  'Red Health-Guwahati',
  'Red Health-Jamshedpur',
  'Red Health-Kolkata',
  'Red Health-Rourkela',
  'Regency Hospital Govind Nagar-Kanpur',
  'Regency Hospital Tower 1 - Kanpur',
  'Regency Hospital- gorakhpur',
  'Regency Hospital-Lucknow',
  'Regency Renal - Kanpur',
  'Regency Tower 2- Kanpur',
  'Sagar Hospital-Jayanagar',
  'Sagar Hospital-Kumaraswamy Layout',
  'Sagar Kanakapura Road',
  'Sakra World Hospital - Bangalore',
  'Sanjeevani CBCC USA CANCER Hospital Raipur',
  'Shalby Orthopedics Centre Of Excellence-Lucknow',
  'Sharda Care Hospital',
  'Shri Venkatesh Superspeciality Hospital',
  'Sparsh Hospital - Infantry Road',
  'Sparsh Hospital - RR Nagar',
  'Sparsh Hospital -Hassan',
  'Sparsh Hospital -Yashwantpur',
  'St Philomenas Hospital',
  'Star Hospital- Banjara Hills',
  'Star Hospital-nanakramguda',
  'Sterling Addlife India Private ltd',
  'The Calcutta Medical Research Institute',
  'Utkal Hospital bhubaneswar',
  'Vijaya Diagnostics - AS Rao Nagar',
  'Vijaya Diagnostics - Ameerpet',
  'Vijaya Diagnostics - BN Reddy Nagar',
  'Vijaya Diagnostics - Dilsukhnagar',
  'Vijaya Diagnostics - Film Nagar',
  'Vijaya Diagnostics - Habsiguda',
  'Vijaya Diagnostics - Himayathnagar',
  'Vijaya Diagnostics - Kukatpally',
  'Vijaya Diagnostics - LB Nagar',
  'Vijaya Diagnostics - Madhapur',
  'Vijaya Diagnostics - Mehdipatnam',
  'Vijaya Diagnostics - SD Road',
  'Vijaya Hospital - Chennai',
  'Website',
  'Yashoda Kaushambi',
  'Yashoda Medicity-Indrapuram',
  'aurobindo hospital indore',
].sort();

// ─── helpers ─────────────────────────────────────────────────────────────────
function set(filters: any, key: string, val: any) { return { ...filters, [key]: val }; }

function toggleArr(arr: string[] | undefined, val: string): string[] {
  const a = arr || [];
  return a.includes(val) ? a.filter(v => v !== val) : [...a, val];
}

// Prune values from a filter array that aren't valid for the given options list.
function pruneToValid(arr: string[] | undefined, validValues: string[]): string[] | undefined {
  if (!arr?.length) return arr;
  const allowed = new Set(validValues);
  const next = arr.filter(v => allowed.has(v));
  return next.length ? next : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FilterPanel({ filters, onChange, dataSource }: Props) {
  const f = filters;
  const cfg = SOURCE_CONFIG[dataSource];
  const isCustomDate = !f.datePreset || f.datePreset === 'custom';
  const [siteSearch, setSiteSearch] = useState('');
  const [siteOptions, setSiteOptions] = useState<string[]>(SITES);
  useEffect(() => {
    fetch('/api/sites')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.sites?.length) {
          const names: string[] = d.sites.map((s: any) => s.displayName).filter(Boolean);
          if (names.length) setSiteOptions(names);
        }
      })
      .catch(() => { /* keep hardcoded fallback */ });
  }, []);

  // When data source flips, drop any previously-selected values that aren't
  // valid for the new source (e.g. 'COMPLETED' selected under HBX becomes
  // invalid when switching to REDos which uses 'fulfilled').
  useEffect(() => {
    const next = { ...f };
    let changed = false;
    const prune = (key: string, valid: string[]) => {
      const pruned = pruneToValid(next[key], valid);
      if (pruned !== next[key]) { next[key] = pruned; changed = true; }
    };
    prune('status',              cfg.statuses.map(o => o.value));
    prune('vehicleType',         cfg.vehicleTypes.map(o => o.value));
    prune('ownershipType',       cfg.ownership.map(o => o.value));
    prune('orderClassification', cfg.orderClassification.map(o => o.value));
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

  return (
    <div className={styles.wrap}>
      {/* Source banner so the user always knows which DB these filters target */}
      <div
        className={styles.section}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
      >
        <strong>Filtering against:</strong>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            background: dataSource === 'redos' ? '#e6f4ea' : '#e8f0fe',
            color: dataSource === 'redos' ? '#137333' : '#1a73e8',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {cfg.title} · {cfg.badge}
        </span>
      </div>

      <div className={styles.grid}>

        {/* ─ Date Filters ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>📅 Date Filter</h3>

          <div className={styles.field}>
            <label className={styles.label}>Date Logic</label>
            <div className={styles.radioGroup}>
              {[
                { val: 'creation',    label: 'Creation Date',    desc: 'Funnel / Ops' },
                { val: 'fulfillment', label: 'Fulfillment Date', desc: 'Finance' },
              ].map(o => (
                <label key={o.val} className={`${styles.radioCard} ${f.dateField === o.val ? styles.radioCardActive : ''}`}>
                  <input
                    type="radio" name="dateField" value={o.val}
                    checked={f.dateField === o.val}
                    onChange={() => onChange(set(f, 'dateField', o.val))}
                  />
                  <span className={styles.radioLabel}>{o.label}</span>
                  <span className={styles.radioDesc}>{o.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date Preset</label>
            <div className={styles.presets}>
              {DATE_PRESETS.map(p => (
                <button
                  key={p.value}
                  className={`${styles.presetBtn} ${f.datePreset === p.value ? styles.presetBtnActive : ''}`}
                  onClick={() => onChange(set(f, 'datePreset', p.value))}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {(isCustomDate || f.datePreset === 'custom') && (
            <div className={styles.dateRange}>
              <div className={styles.field}>
                <label className={styles.label}>From</label>
                <input className={styles.dateInput} type="date" value={f.dateFrom || ''}
                  onChange={e => onChange({ ...set(f, 'dateFrom', e.target.value), datePreset: 'custom' })} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>To</label>
                <input className={styles.dateInput} type="date" value={f.dateTo || ''}
                  onChange={e => onChange({ ...set(f, 'dateTo', e.target.value), datePreset: 'custom' })} />
              </div>
            </div>
          )}
        </section>

        {/* ─ Order Status (source-aware) ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            📋 Order Status <span style={{ fontSize: 11, opacity: 0.7 }}>({cfg.title})</span>
          </h3>
          <div className={styles.checkGroup}>
            {cfg.statuses.map(s => (
              <label key={s.value} className={styles.checkRow}>
                <input type="checkbox"
                  checked={(f.status || []).includes(s.value)}
                  onChange={() => onChange(set(f, 'status', toggleArr(f.status, s.value)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{s.label}</span>
              </label>
            ))}
          </div>
          {(f.status?.length ?? 0) > 0 && (
            <button className={styles.clearBtn} onClick={() => onChange(set(f, 'status', []))}>Clear</button>
          )}
        </section>

        {/* ─ Vehicle Type (source-aware) ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            🚑 Vehicle Type <span style={{ fontSize: 11, opacity: 0.7 }}>({cfg.title})</span>
          </h3>
          <div className={styles.checkGroup}>
            {cfg.vehicleTypes.map(v => (
              <label key={v.value} className={styles.checkRow}>
                <input type="checkbox"
                  checked={(f.vehicleType || []).includes(v.value)}
                  onChange={() => onChange(set(f, 'vehicleType', toggleArr(f.vehicleType, v.value)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{v.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ─ Ownership (source-aware) ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            🏷️ Ownership Type <span style={{ fontSize: 11, opacity: 0.7 }}>({cfg.title})</span>
          </h3>
          <div className={styles.checkGroup}>
            {cfg.ownership.map(o => (
              <label key={o.value} className={styles.checkRow}>
                <input type="checkbox"
                  checked={(f.ownershipType || []).includes(o.value)}
                  onChange={() => onChange(set(f, 'ownershipType', toggleArr(f.ownershipType, o.value)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{o.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ─ Order Classification ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🏷️ Order Classification</h3>
          <div className={styles.checkGroup}>
            {cfg.orderClassification.map(c => (
              <label key={c.value} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={(f.orderClassification || []).includes(c.value)}
                  onChange={() => onChange(set(f, 'orderClassification', toggleArr(f.orderClassification, c.value)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{c.label}</span>
              </label>
            ))}
          </div>
          {(f.orderClassification?.length ?? 0) > 0 && (
            <button className={styles.clearBtn} onClick={() => onChange(set(f, 'orderClassification', []))}>Clear</button>
          )}
        </section>

        {/* ─ Site / Hospital ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🏥 Site / Hospital</h3>
          <input
            className={styles.numInput}
            type="text"
            placeholder="Search hospital or site name..."
            value={siteSearch}
            onChange={e => setSiteSearch(e.target.value)}
            style={{ marginBottom: '8px', width: '100%' }}
          />
          <div className={styles.checkGroup} style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {siteOptions
              .filter(s => !siteSearch || s.toLowerCase().includes(siteSearch.toLowerCase()))
              .map(site => (
                <label key={site} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={(f.siteName || []).includes(site)}
                    onChange={() => onChange(set(f, 'siteName', toggleArr(f.siteName, site)))}
                    className={styles.check}
                  />
                  <span className={styles.checkLabel}>{site}</span>
                </label>
              ))}
          </div>
          {(f.siteName?.length ?? 0) > 0 && (
            <button className={styles.clearBtn} onClick={() => onChange(set(f, 'siteName', []))}>
              Clear ({f.siteName?.length})
            </button>
          )}
        </section>

        {/* ─ City ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🏙️ City</h3>
          <div className={styles.checkGroup}>
            {CITIES.map(c => (
              <label key={c} className={styles.checkRow}>
                <input type="checkbox"
                  checked={(f.city || []).includes(c)}
                  onChange={() => onChange(set(f, 'city', toggleArr(f.city, c)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{c}</span>
              </label>
            ))}
          </div>
        </section>

        {/* -- City Group -- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>City Group</h3>
          <div className={styles.checkGroup}>
            {CITY_GROUPS.map(g => (
              <label key={g} className={styles.checkRow}>
                <input type="checkbox"
                  checked={(f.cityGroup || []).includes(g)}
                  onChange={() => onChange(set(f, 'cityGroup', toggleArr(f.cityGroup, g)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{g}</span>
              </label>
            ))}
          </div>
          {(f.cityGroup?.length ?? 0) > 0 && (
            <button className={styles.clearBtn} onClick={() => onChange(set(f, 'cityGroup', []))}>Clear</button>
          )}
        </section>

        {/* -- Department -- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Department <span style={{ fontSize: 11, opacity: 0.7 }}>(REDos)</span></h3>
          <div className={styles.checkGroup}>
            {DEPARTMENTS.map(d => (
              <label key={d} className={styles.checkRow}>
                <input type="checkbox"
                  checked={(f.department || []).includes(d)}
                  onChange={() => onChange(set(f, 'department', toggleArr(f.department, d)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{d}</span>
              </label>
            ))}
          </div>
          {(f.department?.length ?? 0) > 0 && (
            <button className={styles.clearBtn} onClick={() => onChange(set(f, 'department', []))}>Clear</button>
          )}
        </section>

        {/* ─ Revenue ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>💰 Revenue Range (₹)</h3>
          <div className={styles.rangeRow}>
            <div className={styles.field}>
              <label className={styles.label}>Min (₹)</label>
              <input className={styles.numInput} type="number" placeholder="e.g. 500"
                value={f.minRevenue || ''} min={0}
                onChange={e => onChange(set(f, 'minRevenue', e.target.value ? Number(e.target.value) : undefined))}
              />
            </div>
            <div className={styles.rangeSep}>—</div>
            <div className={styles.field}>
              <label className={styles.label}>Max (₹)</label>
              <input className={styles.numInput} type="number" placeholder="e.g. 10000"
                value={f.maxRevenue || ''} min={0}
                onChange={e => onChange(set(f, 'maxRevenue', e.target.value ? Number(e.target.value) : undefined))}
              />
            </div>
          </div>
        </section>

        {/* ─ Advanced ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>⚙️ Advanced Options</h3>
          <div className={styles.switchGroup}>
            {[
              { key: 'isScheduled',      label: 'Scheduled trips only' },
              { key: 'excludeFreeTrips', label: 'Exclude free trips' },
              { key: 'excludeTestCases', label: 'Exclude test cases' },
              { key: 'countOnly',        label: 'Count only (no row data)' },
            ].map(({ key, label }) => (
              <label key={key} className={styles.switchRow}>
                <div className={`${styles.toggle} ${f[key] ? styles.toggleOn : ''}`}
                  onClick={() => onChange(set(f, key, !f[key]))}>
                  <div className={styles.toggleThumb} />
                </div>
                <span className={styles.switchLabel}>{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ─ Created By (Agent) ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>👤 Created By (Agent)</h3>
          <div className={styles.field}>
            <label className={styles.label}>Agent Name / Email</label>
            <input
              className={styles.numInput}
              type="text"
              placeholder="e.g. Rajeev or rajeev@red.health"
              value={f.createdByEmail || ''}
              onChange={e => onChange(set(f, 'createdByEmail', e.target.value || undefined))}
            />
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
              Searches: Booking Created By → Enquiry Created By → Created By
            </div>
          </div>
          {f.createdByEmail && (
            <button className={styles.clearBtn} onClick={() => onChange(set(f, 'createdByEmail', undefined))}>Clear</button>
          )}
        </section>

        {/* ─ Reset ─ */}
        <section className={styles.section} style={{ borderStyle: 'dashed' }}>
          <button className={styles.resetBtn} onClick={() => onChange({})}>
            🔄 Reset All Filters
          </button>
        </section>

      </div>
    </div>
  );
}