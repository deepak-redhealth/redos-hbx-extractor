const fs = require('fs');

// Move admin page to correct location
const current = fs.readFileSync('C:/Projects/redos-hbx-extractor/app/dashboard/page.tsx', 'utf8');
if (current.includes('app/admin/page.tsx')) {
  fs.mkdirSync('C:/Projects/redos-hbx-extractor/app/admin', { recursive: true });
  fs.writeFileSync('C:/Projects/redos-hbx-extractor/app/admin/page.tsx', current);
  console.log('Saved admin page to app/admin/page.tsx');
}

// Write correct dashboard page
const dashboard = `'use client';
// app/dashboard/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import ColumnSelector from '@/components/ColumnSelector';
import FilterPanel from '@/components/FilterPanel';
import NLQueryInput from '@/components/NLQueryInput';
import QueryPreview from '@/components/QueryPreview';
import ResultsTable from '@/components/ResultsTable';
import TableBrowser from '@/components/TableBrowser';
import AgentChat from '@/components/AgentChat';

type DbSource = 'redos' | 'hbx';
type ExportFmt = 'xlsx' | 'csv';

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [dataSource, setDataSource] = useState('hbx');
  const [selectedCols, setSelectedCols] = useState([]);
  const [aiSelectedCols, setAiSelectedCols] = useState([]);
  const [uiFilters, setUiFilters] = useState({});
  const [nlQuery, setNlQuery] = useState('');
  const [builtSQL, setBuiltSQL] = useState('');
  const [appliedFilters, setAppliedFilters] = useState([]);
  const [aiParsed, setAiParsed] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [results, setResults] = useState(null);
  const [columnDefs, setColumnDefs] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [executionMs, setExecutionMs] = useState(0);
  const [activeTab, setActiveTab] = useState('agent');
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [loadingExec, setLoadingExec] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (!t || !u) { router.push('/'); return; }
    setToken(t); setUser(JSON.parse(u));
  }, [router]);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  }), [token]);

  function logout() {
    localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/');
  }

  async function buildQuery() {
    if (!selectedCols.length) { setError('Please select at least one column first.'); return; }
    setError(''); setLoadingQuery(true);
    try {
      const res = await fetch('/api/query', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ selectedColumns: selectedCols, uiFilters, naturalLanguageInput: nlQuery, dataSource }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setBuiltSQL(data.sql); setAppliedFilters(data.appliedFilters || []); setAiParsed(data.aiParsed); setWarnings(data.warnings || []); setActiveTab('preview');
    } catch { setError('Failed to build query.'); } finally { setLoadingQuery(false); }
  }

  async function executeQuery() {
    if (!selectedCols.length && !builtSQL) { setError('Please select at least one column.'); return; }
    setError(''); setLoadingExec(true); setResults(null);
    try {
      const res = await fetch('/api/execute', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ selectedColumns: selectedCols.length ? selectedCols : aiSelectedCols, uiFilters, naturalLanguageInput: nlQuery, dataSource }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setResults(data.rows); setColumnDefs(data.columnDefs || []); setTotalRows(data.totalRows); setExecutionMs(data.executionMs); setAppliedFilters(data.appliedFilters || []); setWarnings(data.warnings || []); setActiveTab('results');
    } catch { setError('Query execution failed.'); } finally { setLoadingExec(false); }
  }

  async function exportData(fmt) {
    if (!selectedCols.length && !builtSQL) { setError('Please select at least one column.'); return; }
    setError(''); setLoadingExport(true);
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ selectedColumns: selectedCols.length ? selectedCols : aiSelectedCols, uiFilters, naturalLanguageInput: nlQuery, dataSource, format: fmt }) });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="(.+?)"/);
      a.href = url; a.download = match?.[1] || 'export.' + fmt; a.click(); URL.revokeObjectURL(url);
    } catch { setError('Export failed.'); } finally { setLoadingExport(false); }
  }

  function resetAll() {
    setSelectedCols([]); setAiSelectedCols([]); setUiFilters({}); setNlQuery(''); setBuiltSQL('');
    setAppliedFilters([]); setAiParsed(null); setResults(null); setColumnDefs([]); setTotalRows(0);
    setError(''); setWarnings([]); setActiveTab('agent');
  }

  const tabs = [
    { id: 'agent',   label: '✦ AI Agent' },
    { id: 'columns', label: '② Columns' },
    { id: 'filters', label: '③ Filters' },
    { id: 'ai',      label: '④ AI Query' },
    { id: 'preview', label: '⑤ SQL Preview', disabled: !builtSQL },
    { id: 'results', label: '⑥ Results', disabled: !results },
    { id: 'tables',  label: '🗂 Tables' },
  ];

  if (!token) return null;

  return (
    React.createElement('div', { className: styles.page },
      React.createElement('p', null, 'Loading...')
    )
  );
}`;

fs.writeFileSync('C:/Projects/redos-hbx-extractor/app/dashboard/page.tsx', dashboard);
console.log('Done - but this is a placeholder. Use the proper TSX version.');