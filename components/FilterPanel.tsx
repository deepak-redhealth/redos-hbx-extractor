'use client';
// components/FilterPanel.tsx

import styles from './FilterPanel.module.css';

interface Props {
  filters: any;
  onChange: (f: any) => void;
}

const DATE_PRESETS = [
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days',label: 'Last 30 Days' },
  { value: 'thismonth', label: 'This Month' },
  { value: 'lastmonth', label: 'Last Month' },
  { value: 'custom',    label: 'Custom Range' },
];

const VEHICLE_TYPES = ['ALS', 'BLS', 'Ecco', 'Patient Transport'];
const OWNERSHIP     = ['Own', 'Sathi', 'Alliance', 'Others'];
const STATUSES      = ['COMPLETED', 'CANCELLED', 'ASSIGNED', 'DISPATCHED', 'PENDING', 'REASSIGNED'];
const CITIES        = ['Hyderabad', 'Bangalore', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata', 'Noida'];

function set(filters: any, key: string, val: any) { return { ...filters, [key]: val }; }

function toggleArr(arr: string[] | undefined, val: string): string[] {
  const a = arr || [];
  return a.includes(val) ? a.filter(v => v !== val) : [...a, val];
}

export default function FilterPanel({ filters, onChange }: Props) {
  const f = filters;
  const isCustomDate = !f.datePreset || f.datePreset === 'custom';

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>

        {/* ─ Date Filters ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>📅 Date Filter</h3>

          <div className={styles.field}>
            <label className={styles.label}>Date Logic</label>
            <div className={styles.radioGroup}>
              {[
                { val: 'creation', label: 'Creation Date', desc: 'Funnel / Ops' },
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

        {/* ─ Order Status ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>📋 Order Status</h3>
          <div className={styles.checkGroup}>
            {STATUSES.map(s => (
              <label key={s} className={styles.checkRow}>
                <input type="checkbox"
                  checked={(f.status || []).includes(s)}
                  onChange={() => onChange(set(f, 'status', toggleArr(f.status, s)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{s}</span>
              </label>
            ))}
          </div>
          {(f.status?.length ?? 0) > 0 && (
            <button className={styles.clearBtn} onClick={() => onChange(set(f, 'status', []))}>Clear</button>
          )}
        </section>

        {/* ─ Vehicle Type ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🚑 Vehicle Type</h3>
          <div className={styles.checkGroup}>
            {VEHICLE_TYPES.map(v => (
              <label key={v} className={styles.checkRow}>
                <input type="checkbox"
                  checked={(f.vehicleType || []).includes(v)}
                  onChange={() => onChange(set(f, 'vehicleType', toggleArr(f.vehicleType, v)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{v}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ─ Ownership ─ */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🏷️ Ownership Type</h3>
          <div className={styles.checkGroup}>
            {OWNERSHIP.map(o => (
              <label key={o} className={styles.checkRow}>
                <input type="checkbox"
                  checked={(f.ownershipType || []).includes(o)}
                  onChange={() => onChange(set(f, 'ownershipType', toggleArr(f.ownershipType, o)))}
                  className={styles.check}
                />
                <span className={styles.checkLabel}>{o}</span>
              </label>
            ))}
          </div>
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
              { key: 'isScheduled',     label: 'Scheduled trips only' },
              { key: 'excludeFreeTrips',label: 'Exclude free trips' },
              { key: 'excludeTestCases',label: 'Exclude test cases' },
              { key: 'countOnly',       label: 'Count only (no row data)' },
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
            <div style={{fontSize:'11px', color:'var(--text3)', marginTop:'4px'}}>
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
