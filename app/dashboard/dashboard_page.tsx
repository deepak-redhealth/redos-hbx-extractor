'use client';
// app/admin/page.tsx — Admin User Management

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

interface User {
  id: string; email: string; name: string; role: string;
  enabled: boolean; createdAt: string; createdBy: string;
  lastLogin?: string; department?: string; allowedSources?: string[];
}

const ROLES = ['admin', 'analyst', 'viewer'];
const DEPARTMENTS = ['Operations', 'Finance', 'Growth', 'Technology', 'Management', 'Other'];

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken]   = useState('');
  const [users, setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '', name: '', password: '', role: 'analyst',
    department: '', allowedSources: ['both'],
  });

  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (!t || !u) { router.push('/'); return; }
    const parsed = JSON.parse(u);
    if (parsed.role !== 'admin') { router.push('/dashboard'); return; }
    setToken(t);
    loadUsers(t);
  }, []);

  async function loadUsers(t: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', { headers: { Authorization: 'Bearer ' + t } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function callAdmin(body: any) {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await callAdmin({ action: 'create', ...form });
      setSuccess('User created successfully');
      setShowForm(false);
      setForm({ email: '', name: '', password: '', role: 'analyst', department: '', allowedSources: ['both'] });
      loadUsers(token);
    } catch (e: any) { setError(e.message); }
  }

  async function handleUpdate(user: User, changes: Partial<User>) {
    setError(''); setSuccess('');
    try {
      await callAdmin({ action: 'update', id: user.id, ...changes });
      setSuccess('User updated');
      setEditUser(null);
      loadUsers(token);
    } catch (e: any) { setError(e.message); }
  }

  async function handleToggle(user: User) {
    await handleUpdate(user, { enabled: !user.enabled });
  }

  async function handleResetPwd() {
    if (!resetId) return;
    if (newPwd !== confirmPwd) { setError('Passwords do not match'); return; }
    if (newPwd.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    try {
      await callAdmin({ action: 'reset_password', id: resetId, newPassword: newPwd });
      setSuccess('Password reset successfully');
      setResetId(null); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) { setError(e.message); }
  }

  async function handleDelete(id: string) {
    setError(''); setSuccess('');
    try {
      await callAdmin({ action: 'delete', id });
      setSuccess('User deleted');
      setDelConfirm(null);
      loadUsers(token);
    } catch (e: any) { setError(e.message); }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.enabled).length,
    admins: users.filter(u => u.role === 'admin').length,
    disabled: users.filter(u => !u.enabled).length,
  };

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <span className={styles.logo}><strong>Red Health</strong> · Admin</span>
          <span className={styles.navBadge}>User Management</span>
        </div>
        <div className={styles.navRight}>
          <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>← Dashboard</button>
        </div>
      </nav>

      <div className={styles.content}>
        {/* Stats */}
        <div className={styles.statsRow}>
          {[
            { label: 'Total Users', value: stats.total, color: 'blue' },
            { label: 'Active', value: stats.active, color: 'green' },
            { label: 'Admins', value: stats.admins, color: 'red' },
            { label: 'Disabled', value: stats.disabled, color: 'gray' },
          ].map(s => (
            <div key={s.label} className={`${styles.statCard} ${styles['stat_' + s.color]}`}>
              <div className={styles.statVal}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {error   && <div className={styles.errorBanner}>⚠️ {error}<button onClick={() => setError('')}>✕</button></div>}
        {success && <div className={styles.successBanner}>✓ {success}<button onClick={() => setSuccess('')}>✕</button></div>}

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <input className={styles.search} placeholder="Search users by name, email, department..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className={styles.addBtn} onClick={() => { setShowForm(true); setEditUser(null); }}>
            + Add User
          </button>
        </div>

        {/* Add/Edit User Form */}
        {(showForm || editUser) && (
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h3>{editUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => { setShowForm(false); setEditUser(null); }}>✕</button>
            </div>
            <form onSubmit={editUser ? (e) => { e.preventDefault(); handleUpdate(editUser, {
              name: form.name || editUser.name,
              role: form.role as any || editUser.role,
              department: form.department || editUser.department,
              allowedSources: form.allowedSources as any,
            }); } : handleCreate} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Full Name *</label>
                  <input required placeholder="e.g. Deepak Kumar" value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    defaultValue={editUser?.name} />
                </div>
                {!editUser && (
                  <div className={styles.field}>
                    <label>Email *</label>
                    <input required type="email" placeholder="user@red.health" value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                )}
                {!editUser && (
                  <div className={styles.field}>
                    <label>Password *</label>
                    <input required type="password" placeholder="Min 8 characters" value={form.password}
                      onChange={e => setForm({...form, password: e.target.value})} minLength={8} />
                  </div>
                )}
                <div className={styles.field}>
                  <label>Role *</label>
                  <select value={editUser ? editUser.role : form.role}
                    onChange={e => setForm({...form, role: e.target.value})}>
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Department</label>
                  <select value={form.department || editUser?.department || ''}
                    onChange={e => setForm({...form, department: e.target.value})}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Data Access</label>
                  <select value={(form.allowedSources || ['both'])[0]}
                    onChange={e => setForm({...form, allowedSources: [e.target.value]})}>
                    <option value="both">Both (RedOS + HBX)</option>
                    <option value="hbx">HBX (Snowflake) only</option>
                    <option value="redos">RedOS (BigQuery) only</option>
                  </select>
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => { setShowForm(false); setEditUser(null); }}>Cancel</button>
                <button type="submit" className={styles.submitBtn}>
                  {editUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className={styles.tableCard}>
          {loading ? (
            <div className={styles.loading}>Loading users…</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th><th>Role</th><th>Department</th>
                  <th>Data Access</th><th>Last Login</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className={!user.enabled ? styles.rowDisabled : ''}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={`${styles.avatar} ${user.role === 'admin' ? styles.avatarAdmin : ''}`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.userName}>{user.name}</div>
                          <div className={styles.userEmail}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles['role_' + user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className={styles.dept}>{user.department || '—'}</td>
                    <td>
                      <span className={styles.sourceBadge}>
                        {user.allowedSources?.includes('both') ? '🔵🟢 Both' :
                         user.allowedSources?.includes('hbx') ? '🟢 HBX' : '🔵 RedOS'}
                      </span>
                    </td>
                    <td className={styles.lastLogin}>
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : 'Never'}
                    </td>
                    <td>
                      <button
                        className={`${styles.toggleBtn} ${user.enabled ? styles.toggleOn : styles.toggleOff}`}
                        onClick={() => handleToggle(user)}
                        title={user.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {user.enabled ? '✓ Active' : '✗ Disabled'}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={() => {
                          setEditUser(user);
                          setForm({ email: user.email, name: user.name, password: '',
                            role: user.role, department: user.department || '',
                            allowedSources: user.allowedSources || ['both'] });
                          setShowForm(false);
                        }} title="Edit user">✏️</button>
                        <button className={styles.actionBtn} onClick={() => { setResetId(user.id); setNewPwd(''); setConfirmPwd(''); }}
                          title="Reset password">🔑</button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => setDelConfirm(user.id)} title="Delete user">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className={styles.empty}>No users found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>🔑 Reset Password</h3>
            <p>For: <strong>{users.find(u => u.id === resetId)?.email}</strong></p>
            <div className={styles.field}>
              <label>New Password</label>
              <input type="password" placeholder="Min 8 characters" value={newPwd}
                onChange={e => setNewPwd(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Confirm Password</label>
              <input type="password" placeholder="Re-enter password" value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)} />
            </div>
            {error && <div className={styles.fieldError}>{error}</div>}
            <div className={styles.modalActions}>
              <button onClick={() => { setResetId(null); setError(''); }}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleResetPwd}>Reset Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {delConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>⚠️ Delete User</h3>
            <p>Are you sure you want to permanently delete <strong>{users.find(u => u.id === delConfirm)?.email}</strong>?</p>
            <p style={{color: 'var(--text3)', fontSize: '13px', marginTop: '8px'}}>This action cannot be undone. Consider disabling the user instead.</p>
            <div className={styles.modalActions}>
              <button onClick={() => setDelConfirm(null)}>Cancel</button>
              <button className={styles.dangerBtn} onClick={() => handleDelete(delConfirm!)}>Delete User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
