'use client';
// components/NLQueryInput.tsx — Full AI Query flow: Type → Analyze → SQL → Run → Results

import { useState } from 'react';
import styles from './NLQueryInput.module.css';

const EXAMPLES = [
  'Show completed ALS trips in Hyderabad today',
  'Cancelled BLS orders this month in Bangalore',
  'Sathi ambulance completed trips last 7 days',
  'Finance: fulfilled orders with revenue above 500 last month',
  'Response time for ALS trips in Hyderabad last week',
];

const QUERY_TIPS = [
  { icon: '📅', tip: 'Date: use "today", "last 7 days", "this month", "last month"' },
  { icon: '🚑', tip: 'Vehicle: "ALS", "BLS", "ecco", "hearse"' },
  { icon: '🏷️', tip: 'Ownership: "Own", "Sathi", "Alliance"' },
  { icon: '📊', tip: 'Funnel data → RedOS | Finance/billing data → HBX' },
  { icon: '🏙️', tip: 'City: "Hyderabad", "Bangalore", "Chennai", "Mumbai"' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  aiParsed: any;
  onApply: () => void;
  loading: boolean;
  dataSource: 'redos' | 'hbx';
  token: string;
  selectedCols: string[];
  uiFilters: any;
  onSQLBuilt?: (sql: string, filters: string[], parsed: any) => void;
  onColsSelected?: (cols: string[]) => void;
  onResultsReady: (rows: any[], totalRows: number, executionMs: number, colDefs: any[]) => void;
}

type Step = 'input' | 'analyzed' | 'sql' | 'running' | 'done' | 'error';

export default function NLQueryInput({
  value, onChange, aiParsed, onApply, loading,
  dataSource, token, selectedCols, uiFilters, onSQLBuilt, onColsSelected, onResultsReady,
}: Props) {
  const [step, setStep]               = useState<Step>('input');
  const [localParsed, setLocalParsed] = useState<any>(null);
  const [builtSQL, setBuiltSQL]       = useState('');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [warnings, setWarnings]       = useState<string[]>([]);
  const [analyzing, setAnalyzing]     = useState(false);
  const [executing, setExecuting]     = useState(false);
  const [copied, setCopied]           = useState(false);
  const [error, setError]             = useState('');
  const [resultCount, setResultCount] = useState(0);
  const [execMs, setExecMs]           = useState(0);

  const defaultCols = ['order_id', 'order_status', 'city', 'booking_created_at_ist', 'vehicle_type', 'ownership_type'];
  const cols = selectedCols.length ? selectedCols : defaultCols;

  async function handleAnalyze() {
    if (!value.trim()) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selectedColumns: cols, uiFilters, naturalLanguageInput: value, dataSource }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Analysis failed'); setStep('error'); return; }
      setLocalParsed(data.aiParsed);
      // If AI needs clarification, stop and ask
      if (data.aiParsed?.clarificationNeeded) {
        setStep('analyzed');
        return;
      }
      setBuiltSQL(data.sql);
      setAppliedFilters(data.appliedFilters || []);
      setWarnings(data.warnings || []);
      setStep('analyzed');
      // Notify parent so SQL Preview tab becomes available
      if (onSQLBuilt) onSQLBuilt(data.sql, data.appliedFilters || [], data.aiParsed);
      if (onColsSelected) onColsSelected(cols);
    } catch (e: any) {
      setError(e.message || 'Failed to analyze');
      setStep('error');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleRunQuery() {
    setExecuting(true);
    setStep('running');
    setError('');
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selectedColumns: cols, uiFilters, naturalLanguageInput: value, dataSource }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Query failed'); setStep('error'); return; }
      setResultCount(data.totalRows);
      setExecMs(data.executionMs);
      onResultsReady(data.rows, data.totalRows, data.executionMs, data.columnDefs || []);
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Execution failed');
      setStep('error');
    } finally {
      setExecuting(false);
    }
  }

  function handleCopySQL() {
    navigator.clipboard.writeText(builtSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setStep('input');
    setLocalParsed(null);
    setBuiltSQL('');
    setError('');
  }

  function highlight(sql: string) {
    return sql
      .replace(/\b(SELECT|FROM|WHERE|LEFT JOIN|JOIN|ON|AND|OR|WITH|AS|IN|NOT IN|LIMIT|GROUP BY|ORDER BY|CASE|WHEN|THEN|ELSE|END|BETWEEN|ROUND|DATE|CONVERT_TIMEZONE|TIMESTAMP_MILLIS|COALESCE|FORMAT_TIMESTAMP)\b/gi,
        '<span class="sql-kw">$1</span>')
      .replace(/'([^']+)'/g, "<span class='sql-str'>'$1'</span>")
      .replace(/`([^`]+)`/g, '<span class="sql-tbl">`$1`</span>')
      .replace(/--([^\n]+)/g, '<span class="sql-comment">--$1</span>');
  }

  const isDone = ['analyzed','sql','running','done'].indexOf(step) >= 0;

  return (
    <div className={styles.wrap}>

      {/* Step bar */}
      <div className={styles.stepBar}>
        {[
          { id: 'input',    n: 1, label: 'Describe' },
          { id: 'analyzed', n: 2, label: 'AI Interprets' },
          { id: 'sql',      n: 3, label: 'Review SQL' },
          { id: 'done',     n: 4, label: 'Results' },
        ].map((s, i, arr) => {
          const steps = ['input','analyzed','sql','running','done','error'];
          const currentIdx = steps.indexOf(step);
          const thisIdx = steps.indexOf(s.id);
          const isActive = step === s.id || (step === 'running' && s.id === 'sql');
          const isDoneStep = currentIdx > thisIdx && s.id !== 'error';
          return (
            <div key={s.id} className={styles.stepItem}>
              <div className={`${styles.stepDot} ${isActive ? styles.stepDotActive : isDoneStep ? styles.stepDotDone : ''}`}>
                {isDoneStep ? '✓' : s.n}
              </div>
              <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>{s.label}</span>
              {i < arr.length - 1 && <div className={`${styles.stepLine} ${isDoneStep ? styles.stepLineDone : ''}`} />}
            </div>
          );
        })}
      </div>

      {/* Input card */}
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.aiIcon}>✦</span>
          <div>
            <h2 className={styles.title}>AI Query Engine</h2>
            <p className={styles.sub}>Describe your data need in plain English. AI extracts intent, filters, and builds SQL automatically.</p>
          </div>
          {isDone && <button className={styles.resetBtn} onClick={handleReset}>↺ Start over</button>}
        </div>

        <div className={styles.inputWrap}>
          <textarea
            className={styles.textarea}
            placeholder="e.g. Show completed ALS trips in Hyderabad for last 7 days…"
            value={value}
            onChange={e => { onChange(e.target.value); if (step !== 'input') setStep('input'); }}
            rows={4}
            disabled={analyzing || executing}
          />
          <div className={styles.inputFooter}>
            <span className={styles.charCount}>
              {value.length} chars · <span style={{color: dataSource==='redos'?'#7ba7ff':'#4ade80'}}>
                {dataSource === 'redos' ? '🔵 RedOS' : '🟢 HBX'}
              </span>
              {selectedCols.length === 0 && <span style={{color:'#f97316'}}> · using default columns</span>}
            </span>
            <div className={styles.actions}>
              {value && <button className={styles.clearBtn} onClick={() => { onChange(''); handleReset(); }}>Clear</button>}
              <button className={styles.analyzeBtn} onClick={handleAnalyze} disabled={analyzing || !value.trim()}>
                {analyzing
                  ? <><span className={styles.spinner}/>Analyzing…</>
                  : <>✦ Analyze with AI</>}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.examples}>
          <span className={styles.examplesLabel}>Try an example:</span>
          <div className={styles.exampleList}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className={styles.exampleBtn}
                onClick={() => { onChange(ex); setStep('input'); }}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.tipsBar}>
          <span className={styles.tipsLabel}>💡 Query tips:</span>
          <div className={styles.tipsList}>
            {QUERY_TIPS.map((t, i) => (
              <span key={i} className={styles.tip}>{t.icon} {t.tip}</span>
            ))}
          </div>
        </div>
      </div>

      {/* AI Parsed result */}
      {(step === 'analyzed' || step === 'sql' || step === 'running' || step === 'done') && localParsed && (
        <div className={styles.parsedCard}>
          <div className={styles.parsedHeader}>
            <span className={styles.parsedTitle}>✦ AI Interpretation</span>
            <span className={styles.confidence}>{Math.round((localParsed.confidence||0.8)*100)}% confidence</span>
          </div>

          <div className={styles.parsedGrid}>
            <div className={styles.parsedItem}>
              <span className={styles.parsedKey}>Intent</span>
              <span className={`badge ${localParsed.intent==='finance'?'badge-green':localParsed.intent==='funnel'?'badge-blue':'badge-orange'}`}>
                {localParsed.intent||'trip'}
              </span>
            </div>
            {localParsed?.queryMode && (
              <div className={styles.parsedItem}>
                <span className={styles.parsedKey}>Mode</span>
                <span className={`badge ${localParsed.queryMode==='summary'?'badge-purple':localParsed.queryMode==='count'?'badge-blue':'badge-gray'}`}>
                  {localParsed.queryMode}
                </span>
              </div>
            )}
            <div className={styles.parsedItem}>
              <span className={styles.parsedKey}>Source</span>
              <span className={`badge ${dataSource==='redos'?'badge-blue':'badge-green'}`}>
                {dataSource==='redos'?'RedOS · BigQuery':'HBX · Snowflake'}
              </span>
            </div>
            {localParsed.filters && Object.entries(localParsed.filters).map(([k,v]: [string,any]) => {
              if (!v || (Array.isArray(v) && !v.length) || v===null) return null;
              return (
                <div key={k} className={styles.parsedItem}>
                  <span className={styles.parsedKey}>{k.replace(/_/g,' ')}</span>
                  <span className={styles.parsedVal}>
                    {typeof v==='object'&&!Array.isArray(v)
                      ? Object.entries(v).map(([kk,vv])=>`${kk}: ${vv}`).join(', ')
                      : Array.isArray(v) ? v.join(', ') : String(v)}
                  </span>
                </div>
              );
            })}
          </div>

          {appliedFilters.length > 0 && (
            <div className={styles.filterRow}>
              <span className={styles.parsedKey}>Filters:</span>
              {appliedFilters.map((f,i) => <span key={i} className={styles.filterTag}>{f}</span>)}
            </div>
          )}

          {warnings.length > 0 && (
            <div className={styles.warnRow}>⚡ {warnings.join(' · ')}</div>
          )}

          {/* Clarification question */}
          {step === 'analyzed' && localParsed?.clarificationNeeded && localParsed?.clarificationQuestion && (
            <div className={styles.clarifyBox}>
              <div className={styles.clarifyIcon}>🤔</div>
              <div className={styles.clarifyContent}>
                <div className={styles.clarifyTitle}>I need a bit more info</div>
                <div className={styles.clarifyText}>
                  {localParsed.clarificationQuestion.split('\n').map((line: string, i: number) => (
                    <div key={i} style={{marginBottom: 4}} dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}} />
                  ))}
                </div>
                <div className={styles.clarifyHint}>👆 Update your query above with these details and click Analyze again</div>
              </div>
            </div>
          )}

          {step === 'analyzed' && !localParsed?.clarificationNeeded && (
            <div className={styles.stepActions}>
              <button className={styles.sqlBtn} onClick={() => setStep('sql')}>
                ⌨ Review Generated SQL
              </button>
              <button className={styles.runDirectBtn} onClick={handleRunQuery} disabled={executing}>
                {executing ? <><span className={styles.spinner}/>Running…</> : <>▶ Run Query</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SQL Preview */}
      {(step === 'sql' || step === 'running' || step === 'done') && builtSQL && (
        <div className={styles.sqlCard}>
          <div className={styles.sqlHeader}>
            <div className={styles.sqlTitle}>
              <span className={styles.sqlDot}/>
              Generated SQL
              <span className={styles.sqlMeta}>{builtSQL.split('\n').length} lines · {builtSQL.length} chars</span>
            </div>
            <div className={styles.sqlHeaderActions}>
              <button className={styles.copyBtn} onClick={handleCopySQL}>
                {copied ? '✓ Copied' : '⧉ Copy SQL'}
              </button>
              {step === 'sql' && (
                <button className={styles.runBtn} onClick={handleRunQuery} disabled={executing}>
                  {executing ? <><span className={styles.spinner}/>Running…</> : <>▶ Run This Query</>}
                </button>
              )}
            </div>
          </div>
          <div className={styles.sqlScroll}>
            <pre className={styles.sqlCode}
              dangerouslySetInnerHTML={{ __html: highlight(builtSQL) }}
            />
          </div>
        </div>
      )}

      {/* Running */}
      {step === 'running' && (
        <div className={styles.runningCard}>
          <span className={styles.runningSpinner}/>
          <span>Executing on {dataSource==='redos'?'BigQuery (RedOS)':'Snowflake (HBX)'}…</span>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className={styles.doneCard}>
          <span className={styles.doneIcon}>✓</span>
          <div>
            <div className={styles.doneTitle}>{resultCount.toLocaleString()} rows returned in {(execMs/1000).toFixed(2)}s</div>
            <div className={styles.doneSub}>View results in the ⑤ Results tab above</div>
          </div>
          <button className={styles.sqlBtn} onClick={handleReset}>Run another</button>
        </div>
      )}

      {/* Error */}
      {step === 'error' && error && (
        <div className={styles.errorCard}>
          <span>⚠️ {error}</span>
          <button onClick={handleReset}>Try again</button>
        </div>
      )}

      <style>{`
        .sql-kw      { color: #7ba7ff; font-weight: 600; }
        .sql-str     { color: #4ade80; }
        .sql-tbl     { color: #fb923c; }
        .sql-comment { color: #636b8a; font-style: italic; }
      `}</style>
    </div>
  );
}
