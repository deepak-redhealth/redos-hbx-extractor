// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface User {
  id: string; email: string; name: string; passwordHash: string;
  role: string; enabled: boolean; createdAt: string; createdBy: string;
  lastLogin?: string; department?: string; allowedSources?: string[];
}

function getUsers(): User[] {
  // 1. Try USERS_JSON env var (Vercel production)
  try {
    const raw = process.env.USERS_JSON;
    if (raw && raw.trim().startsWith('[')) {
      const users = JSON.parse(raw) as User[];
      if (users.length > 0) return users;
    }
  } catch (e) { console.error('USERS_JSON parse error:', e); }

  // 2. Try file system (local dev only)
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(process.cwd(), 'users.json');
    if (fs.existsSync(file)) {
      const users = JSON.parse(fs.readFileSync(file, 'utf8')) as User[];
      if (users.length > 0) return users;
    }
  } catch {}

  return [];
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const users = getUsers();
    console.log('Users loaded:', users.length, '| Looking for:', email);

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.enabled === false) {
      return NextResponse.json({ error: 'Your account has been disabled. Contact your administrator.' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', valid);
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
      user: { id: user.id, email: user.email, name: user.name, role: user.role, allowedSources: user.allowedSources || ['both'] },
    });
  } catch (err: any) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Auth failed: ' + err.message }, { status: 500 });
  }
}
