const fs = require('fs');
let q = fs.readFileSync('C:/Projects/redos-hbx-extractor/lib/queryBuilder.ts', 'utf8');

// Find and show line 299
const lines = q.split('\n');
console.log('Line 299:', lines[298]);

// Replace the broken line with correct one
const broken = "conditions.push(`fo.ASSIGNMENT_AMBULANCE_TYPE IN (${vehicleTypes.map(v => '''+v+''').join(', ')})`);";
const fixed  = 'conditions.push(`fo.ASSIGNMENT_AMBULANCE_TYPE IN (${vehicleTypes.map(v => `\'${v}\'`).join(\', \')})`);';

if (q.includes(broken)) {
  q = q.replace(broken, fixed);
  fs.writeFileSync('C:/Projects/redos-hbx-extractor/lib/queryBuilder.ts', q, 'utf8');
  console.log('Fixed!');
} else {
  // Try alternate broken form
  const lines = q.split('\n');
  lines[298] = "    conditions.push(`fo.LOWER(ASSIGNMENT_AMBULANCE_TYPE) IN (${vehicleTypes.map(v => \"'\" + v.toLowerCase() + \"'\").join(', ')})`);";
  fs.writeFileSync('C:/Projects/redos-hbx-extractor/lib/queryBuilder.ts', lines.join('\n'), 'utf8');
  console.log('Fixed via line replacement!');
}