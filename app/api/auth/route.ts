import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByEmail, updateLastLogin } from '@/lib/users';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const user = getUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    if (!user.enabled) return NextResponse.json({ error: 'Your account has been disabled. Contact your administrator.' }, { status: 403 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = jwt.sign(
      { email: user.email, name: user.name, role: user.role, id: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    updateLastLogin(user.email);

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, allowedSources: user.allowedSources },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}