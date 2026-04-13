'use client';
// components/ColumnSelector.tsx

import { useEffect, useState, useMemo } from 'react';
import styles from './ColumnSelector.module.css';
import { COLUMN_GROUPS, ColumnDef, ColumnGroup } from '@/lib/columnSchema';

interface Props {
  dataSource: 'redos' | 'hbx';
  selected: string[];
  onChange: (ids: string[]) => void;
  token: string;
}

export default function ColumnSelector({ dataSource, selected, onChange, token }: Props) {
  const [columns, setColumns]   = useState<ColumnDef[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/columns?source=${dataSource}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setColumns(d.columns || []))
      .finally(() => setLoading(false));
  }, [dataSource, token]);

  const filtered = useMemo(() =>
    search.trim()
      ? columns.filter(c =>
          c.label.toLowerCase().includes(search.toLowerCase()) ||
          c.id.toLowerCase().includes(search.toLowerCase()) ||
          c.group.toLowerCase().includes(search.toLowerCase())
        )
      : columns,
    [columns, search]
  );

  const grouped = useMemo(() => {
    const map: Record<string, ColumnDef[]> = {};
    for (const col of filtered) {
      if (!map[col.group]) map[col.group] = [];
      map[col.group].push(col);
    }
    return map;
  }, [filtered]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  }

  function toggleGroup(group: string, cols: ColumnDef[]) {
    const ids = cols.map(c => c.id);
    const allSelected = ids.every(id => selected.includes(id));
    if (allSelected) {
      onChange(selected.filter(id => !ids.includes(id)));
    } else {
      onChange([...new Set([...selected, ...ids])]);
    }
  }

  function selectDefaults() {
    const defaults = columns.filter(c => c.defaultSelected).map(c => c.id);
    onChange(defaults);
  }

  function clearAll() { onChange([]); }

  if (loading) {
    return (
      <div className={styles.wrap}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.skeletonGroup}>
            <div className="skeleton" style={{ height: 36, marginBottom: 12 }} />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="skeleton" style={{ height: 28, marginBottom: 6, marginLeft: 16 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            className={styles.searchInput}
            placeholder="Search columns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <div className={styles.toolbarActions}>
          <button className={styles.actionBtn} onClick={selectDefaults}>Recommended</button>
          <button className={styles.actionBtn} onClick={() => onChange(columns.map(c => c.id))}>Select All</button>
          <button className={styles.actionBtn} onClick={clearAll}>Clear</button>
          <span className={styles.selectedCount}>{selected.length} selected</span>
        </div>
      </div>

      {/* Column Groups */}
      <div className={styles.groupList}>
        {Object.entries(grouped).map(([group, cols]) => {
          const meta = COLUMN_GROUPS[group as ColumnGroup];
          const allSel = cols.every(c => selected.includes(c.id));
          const someSel = cols.some(c => selected.includes(c.id));
          const isCollapsed = collapsed[group];

          return (
            <div key={group} className={styles.group}>
              <div
                className={styles.groupHeader}
                onClick={() => setCollapsed(p => ({ ...p, [group]: !p[group] }))}
              >
                <div className={styles.groupHeaderLeft}>
                  <span className={styles.groupChevron}>{isCollapsed ? '▶' : '▼'}</span>
                  <span className={styles.groupIcon}>{meta?.icon}</span>
                  <span className={styles.groupLabel}>{meta?.label || group}</span>
                  <span className={styles.groupCount}>
                    {cols.filter(c => selected.includes(c.id)).length}/{cols.length}
                  </span>
                </div>
                <label className={styles.groupCheckbox} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={allSel}
                    ref={el => { if (el) el.indeterminate = !allSel && someSel; }}
                    onChange={() => toggleGroup(group, cols)}
                  />
                  <span>Select all</span>
                </label>
              </div>

              {!isCollapsed && (
                <div className={styles.colList}>
                  {cols.map(col => {
                    const isSel = selected.includes(col.id);
                    return (
                      <label key={col.id} className={`${styles.colRow} ${isSel ? styles.colRowSelected : ''}`}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggle(col.id)}
                          className={styles.colCheck}
                        />
                        <div className={styles.colInfo}>
                          <span className={styles.colLabel}>{col.label}</span>
                          {col.description && <span className={styles.colDesc}>{col.description}</span>}
                        </div>
                        <div className={styles.colMeta}>
                          {col.source !== 'both' && (
                            <span className={`badge ${col.source === 'redos' ? 'badge-blue' : 'badge-green'}`}>
                              {col.source === 'redos' ? 'RedOS' : 'HBX'}
                            </span>
                          )}
                          {col.transform && col.transform !== 'none' && (
                            <span className="badge badge-orange">
                              {col.transform === 'ist' ? 'IST' : col.transform === 'paise_to_rupees' ? '₹' : 'KM'}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
