const fs = require('fs');
let q = fs.readFileSync('C:/Projects/redos-hbx-extractor/lib/queryBuilder.ts', 'utf8');

// Fix the broken vehicle type line
const bad = "conditions.push(`fo.ASSIGNMENT_AMBULANCE_TYPE IN (${vehicleTypes.map(v => '''+v+''').join(', ')})`);";
const good = "conditions.push(`fo.ASSIGNMENT_AMBULANCE_TYPE IN (${vehicleTypes.map(v => \"'\" + v + \"'\").join(', ')})`);";

if (q.includes(bad)) {
  q = q.replace(bad, good);
  fs.writeFileSync('C:/Projects/redos-hbx-extractor/lib/queryBuilder.ts', q, 'utf8');
  console.log('Fixed!');
} else {
  console.log('Line not found - showing current line 298:');
  console.log(q.split('\n')[297]);
}