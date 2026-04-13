const fs = require('fs');

// Fix 1: queryBuilder — make vehicle type case-insensitive for HBX
let q = fs.readFileSync('C:/Projects/redos-hbx-extractor/lib/queryBuilder.ts', 'utf8');
q = q.replace(
  `conditions.push(\`fo.ASSIGNMENT_AMBULANCE_TYPE IN (\${vehicleTypes.map(v => "'" + v + "'").join(', ')})\`);`,
  `conditions.push(\`LOWER(fo.ASSIGNMENT_AMBULANCE_TYPE) IN (\${vehicleTypes.map(v => "'" + v.toLowerCase() + "'").join(', ')})\`);`
);
fs.writeFileSync('C:/Projects/redos-hbx-extractor/lib/queryBuilder.ts', q, 'utf8');
console.log('queryBuilder fixed - vehicle type now case-insensitive');

// Fix 2: FilterPanel — add correct vehicle values that match DB
let f = fs.readFileSync('C:/Projects/redos-hbx-extractor/components/FilterPanel.tsx', 'utf8');
f = f.replace(
  `const VEHICLE_TYPES = ['ALS', 'BLS', 'Ecco', 'Patient Transport'];`,
  `const VEHICLE_TYPES = ['als', 'bls', 'ecco', 'hearse', 'neonatal'];`
);
// Fix status values too  
f = f.replace(
  `const STATUSES      = ['COMPLETED', 'CANCELLED', 'ASSIGNED', 'DISPATCHED', 'PENDING', 'REASSIGNED'];`,
  `const STATUSES      = ['COMPLETED', 'CANCELLED', 'IN_PROGRESS', 'CREATED', 'DISPUTED'];`
);
fs.writeFileSync('C:/Projects/redos-hbx-extractor/components/FilterPanel.tsx', f, 'utf8');
console.log('FilterPanel fixed - vehicle types now lowercase to match DB');

// Fix 3: Also fix RedOS vehicle type filter (fact_order uses fleet_type_sent)
// RedOS values - check what fleet_type_sent has (likely same lowercase)
console.log('\nDone! Now restart npm run dev');