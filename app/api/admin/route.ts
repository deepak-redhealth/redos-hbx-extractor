// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface User {
  id: string; email: string; name: string; passwordHash: string;
  role: string; enabled: boolean; createdAt: string; createdBy: string;
  lastLogin?: string; department?: string; allowedSources?: string[];
}

// Built-in fallback admin — always available even if USERS_JSON is missing/broken
const BUILTIN_ADMIN: User = {
  id: '1',
  email: 'deepak.k@red.health',
  name: 'Deepak Kumar',
  passwordHash: '$2a$10$S7Zz0gSsxRqSHwLGv0r.XeH/JPiRmg2u1ouwVVlPW39xXF6YxI2BS',
  role: 'admin',
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'system',
  department: 'Technology',
  allowedSources: ['both'],
};

function getUsers(): User[] {
  const allUsers: User[] = [];

  // 1. Try USERS_JSON env var (Vercel production / additional users)
  try {
    const raw = process.env.USERS_JSON?.trim();
    if (raw && raw.startsWith('[')) {
      const parsed = JSON.parse(raw) as User[];
      if (parsed.length > 0) allUsers.push(...parsed);
    }
  } catch (e) {
    console.error('USERS_JSON parse error:', e);
  }

  // 2. Try file system (local dev)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const file = path.join(process.cwd(), 'users.json');
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as User[];
      if (parsed.length > 0) allUsers.push(...parsed);
    }
  } catch {}

  // 3. Always ensure built-in admin exists (unless overridden by env/file)
  const hasAdmin = allUsers.some(u => u.email === BUILTIN_ADMIN.email);
  if (!hasAdmin) allUsers.push(BUILTIN_ADMIN);

  return allUsers;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.enabled === false) {
      return NextResponse.json({ error: 'Your account has been disabled. Contact your administrator.' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { email: user.email, name: user.name, role: user.role, id: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id, email: user.email, name: user.name,
        role: user.role, allowedSources: user.allowedSources || ['both'],
      },
    });
  } catch (err: any) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Auth failed: ' + err.message }, { status: 500 });
  }
}
