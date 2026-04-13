const fs = require('fs');
let c = fs.readFileSync('C:/Projects/redos-hbx-extractor/lib/columnSchema.ts', 'utf8');

// Replace broken single-quoted CONVERT_TIMEZONE with double-quoted versions
c = c.replace(
  `hbxExpr: 'CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.META_BOOKING_CREATED_AT_TIMESTAMP) AS booking_created_at_ist'`,
  `hbxExpr: "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.META_BOOKING_CREATED_AT_TIMESTAMP) AS booking_created_at_ist"`
);
c = c.replace(
  `hbxExpr: 'CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.FULFILLMENT_CREATED_AT_TIMESTAMP) AS fulfilled_at_ist'`,
  `hbxExpr: "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.FULFILLMENT_CREATED_AT_TIMESTAMP) AS fulfilled_at_ist"`
);
c = c.replace(
  `hbxExpr: 'CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.ASSIGNMENT_ASSIGNED_AT_TIMESTAMP) AS dispatch_assigned_at_ist'`,
  `hbxExpr: "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.ASSIGNMENT_ASSIGNED_AT_TIMESTAMP) AS dispatch_assigned_at_ist"`
);
c = c.replace(
  `hbxExpr: 'CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', TO_TIMESTAMP(fo.META_CANCELLED_AT/1000)) AS meta_cancelled_at_ist'`,
  `hbxExpr: "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', TO_TIMESTAMP(fo.META_CANCELLED_AT/1000)) AS meta_cancelled_at_ist"`
);
c = c.replace(
  `hbxExpr: 'CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.FULFILLMENT_CREATED_AT_TIMESTAMP) AS scheduled_at_ist'`,
  `hbxExpr: "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.FULFILLMENT_CREATED_AT_TIMESTAMP) AS scheduled_at_ist"`
);
c = c.replace(
  `hbxExpr: 'CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.META_CREATED_AT_TIMESTAMP) AS enquiry_created_at_ist'`,
  `hbxExpr: "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.META_CREATED_AT_TIMESTAMP) AS enquiry_created_at_ist"`
);
c = c.replace(
  `hbxExpr: 'CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.META_CREATED_AT_TIMESTAMP) AS meta_created_at_ist'`,
  `hbxExpr: "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.META_CREATED_AT_TIMESTAMP) AS meta_created_at_ist"`
);
c = c.replace(
  `hbxExpr: 'CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.ASSIGNMENT_REACHED_AT_TIMESTAMP) AS reached_pickup_at_ist'`,
  `hbxExpr: "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.ASSIGNMENT_REACHED_AT_TIMESTAMP) AS reached_pickup_at_ist"`
);

fs.writeFileSync('C:/Projects/redos-hbx-extractor/lib/columnSchema.ts', c, 'utf8');
console.log('Done! Checking...');
console.log('Still has broken quotes:', c.includes("CONVERT_TIMEZONE('UTC', 'Asia"));
console.log('Fixed with double quotes:', c.includes('CONVERT_TIMEZONE(\'UTC\'') || c.includes("\"CONVERT_TIMEZONE"));