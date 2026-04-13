// app/api/admin/route.ts — Admin user management API
import { NextRequest, NextResponse } from 'next/server';
import { decodeToken } from '@/lib/auth';
import { getUsers, createUser, updateUser, resetPassword, deleteUser, isAdmin } from '@/lib/users';

function requireAdmin(req: NextRequest): { email: string } | NextResponse {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = decodeToken(token);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  if (!isAdmin(decoded.email)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  return { email: decoded.email };
}

// GET — list all users
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const users = getUsers().map(u => ({
    id: u.id, email: u.email, name: u.name, role: u.role,
    enabled: u.enabled, createdAt: u.createdAt, createdBy: u.createdBy,
    lastLogin: u.lastLogin, department: u.department, allowedSources: u.allowedSources,
  }));
  return NextResponse.json({ users });
}

// POST — create user
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { email, name, password, role, department, allowedSources } = body;
      if (!email || !name || !password) return NextResponse.json({ error: 'Email, name, and password required' }, { status: 400 });
      const user = await createUser({ email, name, password, role: role || 'analyst', department, allowedSources, createdBy: auth.email });
      return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }

    if (action === 'update') {
      const { id, name, role, enabled, department, allowedSources } = body;
      if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      const user = updateUser(id, { name, role, enabled, department, allowedSources });
      return NextResponse.json({ success: true, user });
    }

    if (action === 'reset_password') {
      const { id, newPassword } = body;
      if (!id || !newPassword) return NextResponse.json({ error: 'ID and new password required' }, { status: 400 });
      if (newPassword.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      await resetPassword(id, newPassword);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      deleteUser(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
