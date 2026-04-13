// Run once: node migrate_users.js
// Migrates old users.json to new format with id, enabled, createdAt etc.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'users.json');
if (!fs.existsSync(FILE)) {
  console.log('No users.json found. Creating default admin user...');
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('RedHealth@2024', 10);
  const users = [{
    id: '1', email: 'deepak.k@red.health', name: 'Deepak Kumar',
    passwordHash: hash, role: 'admin', enabled: true,
    createdAt: new Date().toISOString(), createdBy: 'system',
    department: 'Technology', allowedSources: ['both'],
  }];
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2));
  console.log('Created default admin: deepak.k@red.health');
  process.exit(0);
}

const users = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const migrated = users.map((u, i) => ({
  id: u.id || String(Date.now() + i),
  email: u.email,
  name: u.name || u.email.split('@')[0],
  passwordHash: u.passwordHash,
  role: u.role || 'analyst',
  enabled: u.enabled !== undefined ? u.enabled : true,
  createdAt: u.createdAt || new Date().toISOString(),
  createdBy: u.createdBy || 'system',
  lastLogin: u.lastLogin,
  department: u.department || '',
  allowedSources: u.allowedSources || ['both'],
}));

fs.writeFileSync(FILE, JSON.stringify(migrated, null, 2));
console.log('Migrated', migrated.length, 'users:');
migrated.forEach(u => console.log(' -', u.email, '|', u.role, '|', u.enabled ? 'active' : 'disabled'));
