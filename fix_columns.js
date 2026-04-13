const fs = require('fs');
let c = fs.readFileSync('C:/Projects/redos-hbx-extractor/lib/columnSchema.ts', 'utf8');

const fixes = [
  ["meta_booking_created_at_ts_ist_created AS booking_created_at_ist", "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.META_BOOKING_CREATED_AT_TIMESTAMP) AS booking_created_at_ist"],
  ["fulfilled_at_ts_ist_created AS fulfilled_at_ist", "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.FULFILLMENT_CREATED_AT_TIMESTAMP) AS fulfilled_at_ist"],
  ["dispatch_assigned_at_ts_ist_created AS dispatch_assigned_at_ist", "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.ASSIGNMENT_ASSIGNED_AT_TIMESTAMP) AS dispatch_assigned_at_ist"],
  ["META_CANCELLED_AT_IST_CREATED AS meta_cancelled_at_ist", "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', TO_TIMESTAMP(fo.META_CANCELLED_AT/1000)) AS meta_cancelled_at_ist"],
  ["scheduled_at_ist_created AS scheduled_at_ist", "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.FULFILLMENT_CREATED_AT_TIMESTAMP) AS scheduled_at_ist"],
  ["META_ENQUIRY_CREATED_AT_IST_CREATED AS enquiry_created_at_ist", "CONVERT_TIMEZONE('UTC', 'Asia/Kolkata', fo.META_CREATED_AT_TIMESTAMP) AS enquiry_created_at_ist"],
  ["partner_name_extracted_actis AS partner_name", "fo.ASSIGNMENT_AMBULANCE_SERVICE_NAME AS partner_name"],
  ["fo.META_CLASSIFICATION AS order_classification", "fo.META_ORDER_CLASSIFICATION AS order_classification"],
  ["og.city AS city", "fo.FULFILLMENT_CITY AS city"],
  ["fo.META_DISPATCH_TYPE AS dispatch_type", "fo.ASSIGNMENT_DISPATCH_TYPE AS dispatch_type"],
  ["fo.META_CANCELLATION_REASON AS cancellation_reason", "fo.META_CANCELLATION_REMARK AS cancellation_reason"],
];

let count = 0;
for (const [bad, good] of fixes) {
  if (c.includes(bad)) {
    c = c.split(bad).join(good);
    console.log('Fixed:', bad.substring(0, 50));
    count++;
  }
}

fs.writeFileSync('C:/Projects/redos-hbx-extractor/lib/columnSchema.ts', c, 'utf8');
console.log('\nTotal fixes:', count);
console.log('Has old aliases:', c.includes('ts_ist_created'));
console.log('Has CONVERT_TIMEZONE:', c.includes('CONVERT_TIMEZONE'));