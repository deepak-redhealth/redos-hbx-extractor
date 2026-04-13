'use client';
// app/page.tsx  — Login Page

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Left panel — branding */}
      <div className={styles.brand}>
        <div className={styles.brandInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🚑</span>
            <span className={styles.logoText}>Red Health</span>
          </div>
          <h1 className={styles.headline}>
            Your data.<br />
            <span className={styles.highlight}>On demand.</span>
          </h1>
          <p className={styles.sub}>
            Self-service extraction from RedOS & HBX —
            no SQL required. Filters, AI queries, instant exports.
          </p>
          <div className={styles.pills}>
            {['BigQuery · RedOS', 'Snowflake · HBX', 'CSV & Excel Export', 'AI Query Engine'].map(p => (
              <span key={p} className={styles.pill}>{p}</span>
            ))}
          </div>
          <div className={styles.decorGrid}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className={styles.decorCell} style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className={styles.formPanel}>
        <form className={styles.form} onSubmit={handleLogin}>
          <h2 className={styles.formTitle}>Sign in</h2>
          <p className={styles.formSub}>Access the Red Health Data Hub</p>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>✉️</span>
              <input
                className={styles.input}
                type="email"
                placeholder="you@redhealth.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>🔑</span>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <div className={styles.error}>⚠️ {error}</div>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? <span className={styles.spinner} /> : null}
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>

          <p className={styles.footNote}>
            Access restricted to Red Health team members.
          </p>
        </form>
      </div>
    </div>
  );
}
