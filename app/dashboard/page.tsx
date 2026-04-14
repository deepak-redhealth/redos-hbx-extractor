'use client';
// app/dashboard/page.tsx

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ColumnSelector from '@/components/ColumnSelector';
import FilterPanel from '@/components/FilterPanel';
import NLQueryInput from '@/components/NLQueryInput';
import QueryPreview from '@/components/QueryPreview';
import ResultsTable from '@/components/ResultsTable';
import TableBrowser from '@/components/TableBrowser';
import AgentChat from '@/components/AgentChat';
import styles from './dashboard.module.css';

export type DataSource = 'redos' | 'hbx';
export type ExportFmt = 'xlsx' | 'csv';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]                 = useState<any>(null);
  const [token, setToken]               = useState('');
  const [dataSource, setDataSource]     = useState<DataSource>('redos');
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [aiSelectedCols, setAiSelectedCols] = useState<string[]>([]);
  const [uiFilters, setUiFilters]       = useState<any>({});
  const [nlQuery, setNlQuery]           = useState('');
  const [builtSQL, setBuiltSQL]         = useState('');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [aiParsed, setAiParsed]         = useState<any>(null);
  const [results, setResults]           = useState<any[] | null>(null);
  const [columnDefs, setColumnDefs]     = useState<any[]>([]);
  const [totalRows, setTotalRows]       = useState(0);
  const [executionMs, setExecutionMs]   = useState(0);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [loadingExec, setLoadingExec]   = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [error, setError]               = useState('');
  const [activeTab, setActiveTab]       = useState<string>('agent');
  const [warnings, setWarnings]         = useState<string[]>([]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (!t) { router.push('/'); return; }
    setToken(t);
    if (u) setUser(JSON.parse(u));
  }, [router]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  }

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  async function buildQuery() {
    if (!selectedCols.length) { setError('Please select at least one column first.'); return; }
    setError(''); setLoadingQuery(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ selectedColumns: selectedCols, uiFilters, naturalLanguageInput: nlQuery, dataSource }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setBuiltSQL(data.sql);
      setAppliedFilters(data.appliedFilters || []);
      setAiParsed(data.aiParsed);
      setWarnings(data.warnings || []);
      setActiveTab('preview');
    } catch { setError('Failed to build query.'); }
    finally { setLoadingQuery(false); }
  }

  async function executeQuery() {
    if (!selectedCols.length && !builtSQL) { setError('Please select at least one column.'); return; }
    setError(''); setLoadingExec(true); setResults(null);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ selectedColumns: selectedCols.length ? selectedCols : aiSelectedCols, uiFilters, naturalLanguageInput: nlQuery, dataSource }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setResults(data.rows);
      setColumnDefs(data.columnDefs || []);
      setTotalRows(data.totalRows);
      setExecutionMs(data.executionMs);
      setAppliedFilters(data.appliedFilters || []);
      setWarnings(data.warnings || []);
      setActiveTab('results');
    } catch { setError('Query execution failed.'); }
    finally { setLoadingExec(false); }
  }

  function resetAll() {
    setSelectedCols([]);
    setUiFilters({});
    setNlQuery('');
    setBuiltSQL('');
    setAppliedFilters([]);
    setAiParsed(null);
    setResults(null);
    setColumnDefs([]);
    setTotalRows(0);
    setError('');
    setWarnings([]);
    setActiveTab('columns');
    // Note: tables tab preserved
  }

  async function exportData(fmt: ExportFmt) {
    if (!selectedCols.length && !builtSQL) { setError('Please select at least one column.'); return; }
    setError(''); setLoadingExport(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ selectedColumns: selectedCols, uiFilters, naturalLanguageInput: nlQuery, dataSource, format: fmt }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="(.+?)"/);
      a.href = url; a.download = match?.[1] || `export.${fmt}`; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Export failed.'); }
    finally { setLoadingExport(false); }
  }

  const tabs: Array<{ id: string; label: string; icon: string; disabled?: boolean }> = [
    { id: 'agent',   label: '✦ AI Agent', icon: '✦' },
    { id: 'columns', label: '② Columns', icon: '☰' },
    { id: 'filters', label: '② Filters', icon: '⊟' },
    { id: 'ai',      label: '③ AI Query', icon: '✦' },
    { id: 'preview', label: '④ SQL Preview', icon: '⌨', disabled: !builtSQL },
    { id: 'results', label: '⑤ Results', icon: '≡', disabled: !results },
    { id: 'tables',  label: '🗂 Tables', icon: '🗂' },
  ];

  return (
    <div className={styles.page}>
      {/* ── Top Nav ── */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <span className={styles.navLogo}>🚑 <strong>Red Health</strong> Data Hub</span>
          <div className={styles.sourceToggle}>
            {(['redos', 'hbx'] as DataSource[]).map(s => (
              <button
                key={s}
                className={`${styles.sourceBtn} ${dataSource === s ? styles.sourceBtnActive : ''}`}
                onClick={() => { setDataSource(s); setSelectedCols([]); setResults(null); setBuiltSQL(''); }}
              >
                <span className={styles.sourceDot} style={{ background: s === 'redos' ? '#4f7dff' : '#22c55e' }} />
                {s === 'redos' ? 'RedOS · BigQuery' : 'HBX · Snowflake'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.navRight}>
          {selectedCols.length > 0 && (
            <span className={styles.colCount}>{selectedCols.length} columns</span>
          )}
          <button className={styles.buildBtn} onClick={buildQuery} disabled={loadingQuery || !selectedCols.length}>
            {loadingQuery ? <span className={styles.spinner}/> : '⚡'} Preview SQL
          </button>
          <button className={styles.execBtn} onClick={executeQuery} disabled={loadingExec || !selectedCols.length}>
            {loadingExec ? <span className={styles.spinner}/> : '▶'} Run Query
          </button>
          <div className={styles.exportGroup}>
            <button className={styles.exportBtn} onClick={() => exportData('xlsx')} disabled={loadingExport || !selectedCols.length}>
              {loadingExport ? <span className={styles.spinner}/> : '↓'} Excel
            </button>
            <button className={styles.exportBtn} onClick={() => exportData('csv')} disabled={loadingExport || !selectedCols.length}>
              {loadingExport ? <span className={styles.spinner}/> : '↓'} CSV
            </button>
          </div>
          <button className={styles.resetAllBtn} onClick={resetAll} title="Clear all columns, filters and results">
            🔄 Reset
          </button>
          {user?.role === 'admin' && (
            <a href="/admin" className={styles.adminBtn}>⚙ Admin</a>
          )}
          <div className={styles.userBadge}>
            <span>👤</span>
            <span>{user?.name || user?.email}</span>
            <button className={styles.logoutBtn} onClick={logout}>Logout</button>
          </div>
        </div>
      </nav>

      {/* ── Error Banner ── */}
      {error && (
        <div className={styles.errorBanner}>
          ⚠️ {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className={styles.warnBanner}>
          ⚡ {warnings.join(' · ')}
        </div>
      )}

      {/* ── Applied Filters Bar ── */}
      {appliedFilters.length > 0 && (
        <div className={styles.filterBar}>
          <span className={styles.filterBarLabel}>Active Filters:</span>
          {appliedFilters.map((f, i) => (
            <span key={i} className={styles.filterTag}>{f}</span>
          ))}
          {aiParsed && (
            <span className={styles.aiTag}>✦ AI ({Math.round(aiParsed.confidence * 100)}% confidence)</span>
          )}
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''} ${tab.disabled ? styles.tabDisabled : ''}`}
            onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
            disabled={tab.disabled}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main Content ── */}
      <main className={styles.main}>
        {activeTab === 'columns' && (
          <ColumnSelector
            dataSource={dataSource}
            selected={selectedCols}
            onChange={setSelectedCols}
            token={token}
          />
        )}
        {activeTab === 'filters' && (
        <FilterPanel
        filters={uiFilters}
        onChange={setUiFilters}
        dataSource={dataSource}
        />
        )}
        {activeTab === 'ai' && (
          <NLQueryInput
            value={nlQuery}
            onChange={setNlQuery}
            aiParsed={aiParsed}
            onApply={buildQuery}
            loading={loadingQuery}
            dataSource={dataSource}
            token={token}
            selectedCols={selectedCols}
            uiFilters={uiFilters}
            onSQLBuilt={(sql, filters, parsed) => {
              setBuiltSQL(sql);
              setAppliedFilters(filters);
              setAiParsed(parsed);
            }}
            onColsSelected={(cols) => setAiSelectedCols(cols)}
            onResultsReady={(rows, totalRows, executionMs, colDefs) => {
              setResults(rows);
              setColumnDefs(colDefs);
              setTotalRows(totalRows);
              setExecutionMs(executionMs);
              setActiveTab('results');
            }}
          />
        )}
        {activeTab === 'preview' && (
          <QueryPreview
            sql={builtSQL}
            appliedFilters={appliedFilters}
            aiParsed={aiParsed}
            onExecute={executeQuery}
            loading={loadingExec}
          />
        )}
        {activeTab === 'agent' && (
          <AgentChat token={token} />
        )}
        {activeTab === 'tables' && (
          <TableBrowser dataSource={dataSource} token={token} />
        )}
        {activeTab === 'results' && results && (
          <ResultsTable
            rows={results}
            totalRows={totalRows}
            executionMs={executionMs}
            onExport={exportData}
            loading={loadingExport}
          />
        )}
      </main>
    </div>
  );
}
