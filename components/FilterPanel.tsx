'use client';
// components/FilterPanel.tsx

import { useState } from 'react';
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

const VEHICLE_TYPES = ['als', 'bls', 'hearse', 'neonatal'];
const OWNERSHIP     = ['own', 'sathi', 'non-sathi', 'alliance'];
const STATUSES      = ['COMPLETED', 'CANCELLED', 'ASSIGNED', 'DISPATCHED', 'PENDING', 'REASSIGNED'];
const CITIES        = ['Hyderabad', 'Bangalore', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata', 'Noida', 'Gurugram'];

// Top hospitals/sites from both databases (HBX: og.name | BQ: c.branch_name)
const SITES = [
  'AIG Hospital-Gachibowli, Hyderabad',
  'AIG - Gachibowli',
  'Apollo Hospital - Navi Mumbai',
  'CARE Hospital - Banjara Hills',
  'CARE Hospital - HiTech City, Hyderabad',
  'CARE Hospital - Musheerabad',
  'CARE Hospital - Nampally',
  'CARE Hospital Indore',
  'CMRI - Kolkata',
  'Dr Rela Institute and Medical Center- Main Unit',
  'Dr. L H Hiranandani Hospital - Mumbai',
  'Fortis Escorts Heart Institute - Okhla',
  'Fortis Hospital - BG Road, Bengaluru',
  'Fortis Hospital - Shalimar Bagh, Delhi',
  'Fortis Hospital Noida',
  'Fortis Hospital-Hills,Mohali',
  'Fortis Hospital-Mohali',
  'Fortis Memorial Research Institute',
  'Fortis Memorial Research Institute-Gurgaon',
  'Fortis Rajan Dhall Hospital- Vasant Kunj ,Delhi',
  'KIMS Hospital - Secunderabad',
  'KIMS Hospital -Kondapur, Hyderabad',
  'KIMS Sunshine - Secunderabad',
  'KIMS Sunshine-Secunderabad,Hyderabad',
  'Kokilaben Dhirubhai Ambani Hospital',
  'Kokilaben Dhirubhai Ambani Hospital-Mumbai',
  'Medanta Hospital - Lucknow',
  'Medanta Hospital- Lucknow',
  'Medanta Hospital- Patna',
  'Medway Hospital (Dedicated)- Chennai',
  'NH RNT - Kolkata',
  'NH Super Howrah - Kolkata',
  'Paras - kanpur',
  'Paras Hospital - Patna',
  'Paras Hospital- Panchkula',
  'Red Health',
  'Red Health- Bangalore',
  'Red Health- Delhi NCR',
  'Red Health- Hyderabad',
  'Red Health-Kolkata',
  'Regency Hospital Tower 1 - Kanpur',
  'Regency Renal - Kanpur',
  'Regency Tower 1 - Kanpur',
  'Regency Tower 2 - Kanpur',
  'Sakra World Hospital - Bangalore',
  'Sakra World Hospital-Bengaluru',
  'The Calcutta Medical Research Institute',
  'Utkal - Bhubaneswar',
  'Vijaya Hospital - Chennai',
  'Website',
  '911 Brand Number',
  'Yashoda Hospital- Kaushambi, Ghaziabad',
  'Yashoda Kaushambi',
].sort();

function set(filters: any, key: string, val: any) { return { ...filters, [key]: val }; }

function toggleArr(arr: string[] | undefined, val: string): string[] {
  const a = arr || [];
  return a.includes(val) ? a.filter(v => v !== val) : [...a, val];
}

export default function FilterPanel({ filters, onChange }: Props) {
  const f = filters;
  const isCustomDate = !f.datePreset || f.datePreset === 'custom';
  const [siteSearch, setSiteSearch] = useState('');

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
            {SITES
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
