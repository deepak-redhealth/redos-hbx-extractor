'use client';
// components/ResultsTable.tsx

import styles from './ResultsTable.module.css';

interface Props {
  rows: Record<string, any>[];
  totalRows: number;
  executionMs: number;
  onExport: (fmt: 'xlsx' | 'csv') => void;
  loading: boolean;
}

export default function ResultsTable({ rows, totalRows, executionMs, onExport, loading }: Props) {
  if (!rows || rows.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🔍</span>
        <h3>No results found</h3>
        <p>Try adjusting your filters or column selection</p>
      </div>
    );
  }

  const headers = Object.keys(rows[0]);

  const CURRENCY_COLS = new Set(['total_revenue_inr','avg_revenue_inr','total_price','amount_paid','amount_left','base_price','total_discount','pending_balance_wallet_internal','pending_balance_wallet_operator','amount_received_in_terminal_account_created']);
  const COUNT_COLS    = new Set(['total_count','unique_orders','order_count','pending_transactions_count_wallet_internal','pending_transactions_count_wallet_operator']);

  function formatCell(val: any, colName?: string): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') {
      if (val instanceof Date) return val.toLocaleDateString('en-IN');
      return JSON.stringify(val);
    }
    const col = (colName || '').toLowerCase();
    const num = Number(val);
    if (!isNaN(num) && String(val).trim() !== '') {
      // Currency columns — show ₹ with 2 decimals + comma separators
      if (CURRENCY_COLS.has(col) || col.includes('revenue') || col.includes('amount') || col.includes('price') || col.includes('fare') || col.includes('balance')) {
        return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      // Count columns — integer with commas
      if (COUNT_COLS.has(col) || col.includes('count') || col.includes('_count') || col === 'order_count') {
        return Math.round(num).toLocaleString('en-IN');
      }
      // Time/distance — 2 decimals max
      if (col.includes('time') || col.includes('distance') || col.includes('duration')) {
        return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      }
      // Large integers — add commas
      if (Number.isInteger(num) || String(val).indexOf('.') === -1) {
        return num.toLocaleString('en-IN');
      }
      // Default float — max 4 decimals
      return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
    }
    return String(val);
  }

  function cellClass(val: any, colName?: string): string {
    if (val === null || val === undefined) return styles.cellNull;
    if (typeof val === 'boolean') return val ? styles.cellTrue : styles.cellFalse;
    const col = (colName || '').toLowerCase();
    const s   = String(val);
    if (s === 'COMPLETED') return styles.cellCompleted;
    if (s === 'CANCELLED') return styles.cellCancelled;
    if (s === 'IN_PROGRESS') return styles.cellInProgress;
    if (s === 'DISPUTED')   return styles.cellDisputed;
    const num = Number(val);
    if (!isNaN(num) && s.trim() !== '') return styles.cellNum;
    return '';
  }

  return (
    <div className={styles.wrap}>
      {/* Stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <span className={styles.statIcon}>≡</span>
            <strong>{totalRows.toLocaleString()}</strong> rows
          </span>
          <span className={styles.stat}>
            <span className={styles.statIcon}>☰</span>
            <strong>{headers.length}</strong> columns
          </span>
          <span className={styles.stat}>
            <span className={styles.statIcon}>⚡</span>
            <strong>{(executionMs / 1000).toFixed(2)}s</strong> execution
          </span>
          {totalRows > rows.length && (
            <span className={styles.statWarn}>
              Preview: first {rows.length.toLocaleString()} rows. Export for full data.
            </span>
          )}
        </div>
        <div className={styles.exportBtns}>
          <button
            className={`${styles.exportBtn} ${styles.exportXlsx}`}
            onClick={() => onExport('xlsx')}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : '↓'} Excel (.xlsx)
          </button>
          <button
            className={`${styles.exportBtn} ${styles.exportCsv}`}
            onClick={() => onExport('csv')}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : '↓'} CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.indexTh}>#</th>
              {headers.map(h => (
                <th key={h} className={styles.th} title={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={styles.tr}>
                <td className={styles.indexCell}>{i + 1}</td>
                {headers.map(h => (
                  <td key={h} className={`${styles.td} ${cellClass(row[h])}`}>
                    {formatCell(row[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
