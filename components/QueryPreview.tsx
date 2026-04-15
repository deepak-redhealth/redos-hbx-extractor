'use client';
// components/QueryPreview.tsx

import { useState } from 'react';
import styles from './QueryPreview.module.css';

interface Props {
  sql: string;
  appliedFilters?: string[];
  aiParsed?: any;
  onExecute?: () => void;
  loading?: boolean;
}

export default function QueryPreview({ sql, appliedFilters, aiParsed, onExecute, loading }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function highlight(sql: string) {
    return sql
      .replace(/\b(SELECT|FROM|WHERE|LEFT JOIN|JOIN|ON|AND|OR|WITH|AS|IN|NOT IN|LIMIT|GROUP BY|ORDER BY|HAVING|CASE|WHEN|THEN|ELSE|END|DISTINCT|BETWEEN|IS NULL|IS NOT NULL|ROUND|FORMAT_TIMESTAMP|DATE|TIMESTAMP_MILLIS|CONVERT_TIMEZONE|TO_TIMESTAMP|COALESCE|UNNEST|QUALIFY|ROW_NUMBER|OVER|PARTITION BY|SUM|COUNT|MAX|MIN|AVG|LISTAGG|WITHIN GROUP|NULLIF|TRY_TO_NUMBER)\b/gi,
        '<span class="sql-kw">$1</span>')
      .replace(/'([^']+)'/g, '<span class="sql-str">\'$1\'</span>')
      .replace(/`([^`]+)`/g, '<span class="sql-tbl">`$1`</span>')
      .replace(/--([^\n]+)/g, '<span class="sql-comment">--$1</span>');
  }

  return (
    <div className={styles.wrap}>
      {/* Filter summary */}
      {appliedFilters.length > 0 && (
        <div className={styles.filterSummary}>
          <h3 className={styles.sumTitle}>Applied Filters</h3>
          <div className={styles.filterTags}>
            {appliedFilters.map((f, i) => (
              <span key={i} className={styles.filterTag}>{f}</span>
            ))}
            {aiParsed && (
              <span className={styles.aiTag}>✦ AI Enhanced ({Math.round(aiParsed.confidence * 100)}%)</span>
            )}
          </div>
        </div>
      )}

      {/* SQL block */}
      <div className={styles.sqlCard}>
        <div className={styles.sqlHeader}>
          <div className={styles.sqlTitle}>
            <span className={styles.sqlDot} />
            Generated SQL
          </div>
          <div className={styles.sqlActions}>
            <button className={styles.copyBtn} onClick={copy}>
              {copied ? '✓ Copied' : '⧉ Copy'}
            </button>
            <button className={styles.execBtn} onClick={onExecute} disabled={loading}>
              {loading ? <><span className={styles.spinner} /> Running…</> : '▶ Execute Query'}
            </button>
          </div>
        </div>
        <div className={styles.sqlScroll}>
          <pre
            className={styles.sqlCode}
            dangerouslySetInnerHTML={{ __html: highlight(sql) }}
          />
        </div>
      </div>

      {/* Style element for SQL highlight classes */}
      <style>{`
        .sql-kw      { color: #7ba7ff; font-weight: 600; }
        .sql-str     { color: #4ade80; }
        .sql-tbl     { color: #fb923c; }
        .sql-comment { color: #636b8a; font-style: italic; }
      `}</style>

      {/* Query Stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Characters</span>
          <span className={styles.statVal}>{sql.length.toLocaleString()}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Lines</span>
          <span className={styles.statVal}>{sql.split('\n').length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Filters applied</span>
          <span className={styles.statVal}>{appliedFilters.length}</span>
        </div>
      </div>
    </div>
  );
}
