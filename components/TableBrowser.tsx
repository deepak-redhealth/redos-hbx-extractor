'use client';
// components/TableBrowser.tsx — Browse all available tables in both DBs

import { useState, useEffect, useMemo } from 'react';
import styles from './TableBrowser.module.css';
import { TABLE_CATEGORIES } from '@/lib/tableCatalog';

interface TableInfo {
  id: string; db: string; fullName: string; alias: string;
  category: string; description: string; joinKey?: string; isCore?: boolean;
}

interface Props { dataSource: 'redos' | 'hbx'; token: string; }

const CATEGORY_ICONS: Record<string, string> = {
  orders:'🚑', fleet:'🚘', users:'👤', finance:'💰',
  calls:'📞', attendance:'📅', analytics:'📊', partners:'🏥', misc:'📦',
};

export default function TableBrowser({ dataSource, token }: Props) {
  const [tables, setTables]       = useState<TableInfo[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copied, setCopied]       = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tables?db=${dataSource}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setTables(d.tables || []))
      .finally(() => setLoading(false));
  }, [dataSource, token]);

  const categories = useMemo(() => {
    const cats = [...new Set(tables.map(t => t.category))];
    return ['all', ...cats];
  }, [tables]);

  const filtered = useMemo(() => {
    return tables.filter(t => {
      const matchCat = activeCategory === 'all' || t.category === activeCategory;
      const matchSearch = !search.trim() ||
        t.fullName.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [tables, search, activeCategory]);

  function copyTableName(name: string) {
    navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied(''), 2000);
  }

  if (loading) return (
    <div className={styles.wrap}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton" style={{height:60, marginBottom:8, borderRadius:8}} />
      ))}
    </div>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>
            {dataSource === 'redos' ? '🔵 BigQuery (RedOS)' : '🟢 Snowflake (HBX)'} — Table Catalog
          </h2>
          <p className={styles.sub}>{tables.length} tables available · Click table name to copy for SQL use</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search tables..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className={styles.cats}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.catBtn} ${activeCategory === cat ? styles.catBtnActive : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? '🗂 All' : `${CATEGORY_ICONS[cat] || '📦'} ${cat}`}
              <span className={styles.catCount}>
                {cat === 'all' ? tables.length : tables.filter(t => t.category === cat).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableGrid}>
        {filtered.map(t => (
          <div key={t.id} className={`${styles.tableCard} ${t.isCore ? styles.tableCardCore : ''}`}>
            <div className={styles.tableTop}>
              <div className={styles.tableLeft}>
                <span className={styles.categoryIcon}>{CATEGORY_ICONS[t.category] || '📦'}</span>
                <div>
                  <button
                    className={styles.tableName}
                    onClick={() => copyTableName(t.fullName)}
                    title="Click to copy full table name"
                  >
                    {t.fullName.split('.').pop()?.replace(/`/g,'')}
                    {copied === t.fullName ? <span className={styles.copiedBadge}>✓ Copied</span> : <span className={styles.copyHint}>⧉</span>}
                  </button>
                  <div className={styles.tableAlias}>alias: <code>{t.alias}</code></div>
                </div>
              </div>
              <div className={styles.tableRight}>
                {t.isCore && <span className={styles.coreBadge}>Core</span>}
                <span className={`badge badge-gray`}>{t.category}</span>
              </div>
            </div>
            <p className={styles.tableDesc}>{t.description}</p>
            {t.joinKey && (
              <div className={styles.joinKey}>
                <span className={styles.joinLabel}>JOIN:</span>
                <code className={styles.joinCode}>{t.joinKey}</code>
              </div>
            )}
            <div className={styles.fullPath}>{t.fullName}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.empty}>No tables match your search</div>
      )}
    </div>
  );
}
