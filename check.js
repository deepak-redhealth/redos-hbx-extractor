const fs = require('fs');
const c = fs.readFileSync('C:/Projects/redos-hbx-extractor/lib/queryBuilder.ts', 'utf8');
console.log('Has COALESCE city:', c.includes('COALESCE(fo.FULFILLMENT_CITY, fo.META_CITY)'));
console.log('Has HYD mapping:', c.includes("hyderabad: ['HYD']"));
console.log('Has city code map:', c.includes('CITY_CODE_MAP'));