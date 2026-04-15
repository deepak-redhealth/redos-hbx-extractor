'use client';
// components/AgentChat.tsx — Intelligent AI Agent chat interface

import { useState, useRef, useEffect } from 'react';
import styles from './AgentChat.module.css';
import QueryPreview from './QueryPreview';

interface Message {
  role: 'user' | 'agent';
  content: string;
  toolsUsed?: { tool: string; purpose: string; db?: string }[];
  iterations?: number;
    sqlCalls?: { db: string; sql: string; purpose: string; rowCount: number }[];
loading?: boolean;
}

interface Props { token: string; }

const SUGGESTIONS = [
  'Date wise revenue for this month excluding today as per finance logic',
  'Count of completed ALS trips city wise today',
  'Which agent created the most bookings this week?',
  'Compare completed vs cancelled orders by vehicle type this month',
  'Show dispatch response time (ATW) for Hyderabad last 7 days',
  'Total revenue by ownership type this month',
  'How many Sathi BLS trips were fulfilled last month city wise?',
  'Top 10 partners by completed trips this month',
];

export default function AgentChat({ token }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [history, setHistory]   = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text?: string) {
    const q = (text || input).trim();
    if (!q || loading) return;

    const userMsg: Message = { role: 'user', content: q };
    const loadingMsg: Message = { role: 'agent', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const agentMsg: Message = {
        role: 'agent',
        content: data.answer,
        toolsUsed: data.toolsUsed,
        iterations: data.iterations,
        sqlCalls: data.sqlCalls,
      };

      // Update history for multi-turn
      setHistory(prev => [
        ...prev,
        { role: 'user', content: q },
        { role: 'assistant', content: [{ type: 'text', text: data.answer }] },
      ]);

      setMessages(prev => [...prev.slice(0, -1), agentMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'agent',
        content: `⚠️ ${err.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function formatAnswer(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.*)/gm, '<h3>$1</h3>')
      .replace(/^## (.*)/gm, '<h2>$1</h2>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br/>');
  }

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.agentIcon}>✦</span>
          <div>
            <h2 className={styles.title}>Intelligent Data Agent</h2>
            <p className={styles.sub}>Ask anything. The agent inspects schemas, writes SQL, queries both databases, and gives you answers in plain English.</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button className={styles.clearBtn} onClick={() => { setMessages([]); setHistory([]); }}>
            Clear chat
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className={styles.chatArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>✦</div>
            <h3 className={styles.emptyTitle}>What do you want to know?</h3>
            <p className={styles.emptySub}>Ask in plain English — I'll figure out the SQL, join the right tables, and give you the answer.</p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className={styles.suggestion} onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgRowUser : styles.msgRowAgent}`}>
                {msg.role === 'agent' && (
                  <div className={styles.agentAvatar}>✦</div>
                )}
                <div className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAgent}`}>
                  {msg.loading ? (
                    <div className={styles.thinking}>
                      <span className={styles.dot}/>
                      <span className={styles.dot}/>
                      <span className={styles.dot}/>
                      <span className={styles.thinkingText}>Inspecting schema and querying databases…</span>
                    </div>
                  ) : (
                    <>
                      <div
                        className={styles.answerText}
                        dangerouslySetInnerHTML={{ __html: formatAnswer(msg.content) }}
                      />
                      {msg.sqlCalls && msg.sqlCalls.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {msg.sqlCalls.map((call, ci) => (
                            <details key={ci} style={{ border: '1px solid #2a2a3a', borderRadius: 8, background: '#0f0f17' }}>
                              <summary style={{ cursor: 'pointer', padding: '8px 12px', fontSize: 12, color: '#9aa0b4', userSelect: 'none' }}>
                                SQL #{ci + 1} · <strong style={{ color: call.db === 'redos' ? '#4a9eff' : '#29b5e8' }}>{call.db.toUpperCase()}</strong> · {call.purpose} · {call.rowCount} rows
                              </summary>
                              <div style={{ padding: 8 }}>
                                <QueryPreview sql={call.sql} />
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                      {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                        <div className={styles.toolsUsed}>
                          <span className={styles.toolsLabel}>Tools used:</span>
                          {msg.toolsUsed.map((t, ti) => (
                            <span key={ti} className={styles.toolTag}>
                              {t.tool === 'inspect_schema' ? '🔍 Schema' :
                               t.tool === 'run_sql' ? `⚡ SQL (${t.db?.toUpperCase()})` :
                               t.tool === 'cross_db_join' ? '🔗 Cross-DB Join' : t.tool}
                            </span>
                          ))}
                          <span className={styles.iterLabel}>{msg.iterations} steps</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className={styles.userAvatar}>👤</div>
                )}
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          placeholder="Ask anything — e.g. 'date wise revenue for this month by city as per finance logic'"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          rows={2}
          disabled={loading}
        />
        <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          {loading ? <span className={styles.spinner}/> : '▶'}
        </button>
      </div>
      <div className={styles.inputHint}>Press Enter to send · Shift+Enter for new line · Agent uses Claude Opus 4 with tool use</div>
    </div>
  );
}
