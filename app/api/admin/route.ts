import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { decodeToken } from '@/lib/auth';

interface User { id: string; email: string; name: string; passwordHash: string; role: string; enabled: boolean; createdAt: string; createdBy: string; lastLogin?: string; department?: string; allowedSources?: string[]; }

const BUILTIN: User = { id: '1', email: 'deepak.k@red.health', name: 'Deepak Kumar', passwordHash: '$2a$10$S7Zz0gSsxRqSHwLGv0r.XeH/JPiRmg2u1ouwVVlPW39xXF6YxI2BS', role: 'admin', enabled: true, createdAt: '2026-01-01T00:00:00.000Z', createdBy: 'system', department: 'Technology', allowedSources: ['both'] };

function getUsers(): User[] {
  try { const raw = process.env.USERS_JSON?.trim(); if (raw?.startsWith('[')) { const u = JSON.parse(raw) as User[]; if (u.length > 0) return u; } } catch {}
  try { const fs = require('fs'), path = require('path'); const f = path.join(process.cwd(), 'users.json'); if (fs.existsSync(f)) { const u = JSON.parse(fs.readFileSync(f, 'utf8')); if (u.length > 0) return u; } } catch {}
  return [BUILTIN];
}

async function saveUsers(users: User[]): Promise<{ ok: boolean; message?: string }> {
  const json = JSON.stringify(users);
  if (process.env.NODE_ENV !== 'production') {
    try { const fs = require('fs'), path = require('path'); fs.writeFileSync(path.join(process.cwd(), 'users.json'), JSON.stringify(users, null, 2)); return { ok: true }; } catch (e: any) { return { ok: false, message: e.message }; }
  }
  const t = process.env.VERCEL_TOKEN;
  if (!t) return { ok: false, message: 'VERCEL_TOKEN not set in environment variables' };
  const proj = 'prj_9pNSvzrjQYroEle0pDA406OXK54I', team = 'team_Ien3F9Xg4cWnh1JVBQC8gV9O';
  try {
    const list = await (await fetch(`https://api.vercel.com/v9/projects/${proj}/env?teamId=${team}`, { headers: { Authorization: `Bearer ${t}` } })).json();
    const ex = list.envs?.find((e: any) => e.key === 'USERS_JSON');
    if (ex) {
      const r = await fetch(`https://api.vercel.com/v9/projects/${proj}/env/${ex.id}?teamId=${team}`, { method: 'PATCH', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: json }) });
      if (!r.ok) return { ok: false, message: 'Vercel PATCH failed: ' + await r.text() };
    } else {
      const r = await fetch(`https://api.vercel.com/v10/projects/${proj}/env?teamId=${team}`, { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'USERS_JSON', value: json, type: 'encrypted', target: ['production', 'preview', 'development'] }) });
      if (!r.ok) return { ok: false, message: 'Vercel POST failed: ' + await r.text() };
    }
    return { ok: true };
  } catch (e: any) { return { ok: false, message: e.message }; }
}

function requireAdmin(req: NextRequest): { email: string } | NextResponse {
  const t = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!t) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const d = decodeToken(t);
  if (!d) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const u = getUsers().find((u: User) => u.email.toLowerCase() === d.email?.toLowerCase());
  if (!u || u.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  return { email: d.email };
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ users: getUsers().map((u: User) => ({ id: u.id, email: u.email, name: u.name, role: u.role, enabled: u.enabled, createdAt: u.createdAt, createdBy: u.createdBy, lastLogin: u.lastLogin, department: u.department, allowedSources: u.allowedSources })) });
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const users = getUsers();
    if (body.action === 'create') {
      const { email, name, password, role, department, allowedSources } = body;
      if (!email || !name || !password) return NextResponse.json({ error: 'Email, name, password required' }, { status: 400 });
      if (users.find((u: User) => u.email.toLowerCase() === email.toLowerCase())) return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      users.push({ id: Date.now().toString(), email: email.toLowerCase().trim(), name: name.trim(), passwordHash: await bcrypt.hash(password, 10), role: role || 'analyst', enabled: true, createdAt: new Date().toISOString(), createdBy: auth.email, department, allowedSources: allowedSources || ['both'] });
    } else if (body.action === 'update') {
      const idx = users.findIndex((u: User) => u.id === body.id);
      if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const { action, id, ...fields } = body;
      Object.assign(users[idx], fields);
    } else if (body.action === 'reset_password') {
      const idx = users.findIndex((u: User) => u.id === body.id);
      if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      if (!body.newPassword || body.newPassword.length < 8) return NextResponse.json({ error: 'Password must be 8+ chars' }, { status: 400 });
      users[idx].passwordHash = await bcrypt.hash(body.newPassword, 10);
    } else if (body.action === 'delete') {
      const idx = users.findIndex((u: User) => u.id === body.id);
      if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      users.splice(idx, 1);
    } else return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    const result = await saveUsers(users);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}