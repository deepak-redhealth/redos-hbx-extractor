// lib/users.ts — User management with file-based persistence
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'analyst' | 'viewer';
  enabled: boolean;
  createdAt: string;
  createdBy: string;
  lastLogin?: string;
  department?: string;
  allowedSources?: ('redos' | 'hbx' | 'both')[];
}

const USERS_FILE = path.join(process.cwd(), 'users.json');

export function getUsers(): User[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(raw) as User[];
    }
    // Fallback to env var
    const raw = process.env.USERS_JSON || '[]';
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

export function getUserByEmail(email: string): User | undefined {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function isAdmin(email: string): boolean {
  const user = getUserByEmail(email);
  return user?.role === 'admin';
}

export async function createUser(data: {
  email: string; name: string; password: string;
  role: User['role']; department?: string;
  allowedSources?: User['allowedSources']; createdBy: string;
}): Promise<User> {
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('User with this email already exists');
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user: User = {
    id: Date.now().toString(),
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
    passwordHash,
    role: data.role,
    enabled: true,
    createdAt: new Date().toISOString(),
    createdBy: data.createdBy,
    department: data.department,
    allowedSources: data.allowedSources || ['both'],
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export function updateUser(id: string, updates: Partial<Pick<User, 'name' | 'role' | 'enabled' | 'department' | 'allowedSources'>>): User {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found');
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export async function resetPassword(id: string, newPassword: string): Promise<void> {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found');
  users[idx].passwordHash = await bcrypt.hash(newPassword, 10);
  saveUsers(users);
}

export function deleteUser(id: string): void {
  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);
}

export function updateLastLogin(email: string): void {
  const users = getUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (idx !== -1) {
    users[idx].lastLogin = new Date().toISOString();
    saveUsers(users);
  }
}
