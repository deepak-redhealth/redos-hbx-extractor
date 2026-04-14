// lib/columnSchema.ts — column names verified against actual DB schemas

export type ColumnSource = 'redos' | 'hbx' | 'both';
export type ColumnGroup = 'trip' | 'finance' | 'fleet' | 'partner' | 'patient' | 'timestamps' | 'operational' | 'user' | 'wallet' | 'response_metrics';

export interface ColumnDef {
  id: string;
  label: string;
  group: ColumnGroup;
  source: ColumnSource;
  redosExpr?: string;
  hbxExpr?: string;
  description?: string;
  transform?: 'ist' | 'paise_to_rupees' | 'meters_to_km' | 'none';
  defaultSelected?: boolean;
}

export const COLUMN_SCHEMA: ColumnDef[] = [

  // ─── TRIP CORE ────────────────────────────────────────────────────────────────
  { id: 'order_id', label: 'Order ID', group: 'trip', source: 'both',
    redosExpr: 'fo.order_id',
    hbxExpr: 'fo.META_ORDER_ID AS order_id',
    defaultSelected: true },

  { id: 'order_status', label: 'Order Status', group: 'trip', source: 'both',
    redosExpr: 'fo.oms_order_status AS order_status',
    hbxExpr: 'fo.META_ORDER_STATUS AS order_status',
    defaultSelected: true },

  { id: 'order_type', label: 'Order Type', group: 'trip', source: 'hbx',
    hbxExpr: 'fo.META_ORDER_TYPE AS order_type' },

  { id: 'order_classification', label: 'Order Classification', group: 'trip', source: 'both',
    redosExpr: 'fo.order_classification',
    hbxExpr: 'fo.META_ORDER_CLASSIFICATION AS order_classification' },

  { id: 'city', label: 'City', group: 'trip', source: 'both',
    redosExpr: 'fo.city',
    hbxExpr: 'fo.FULFILLMENT_CITY AS city',
    defaultSelected: true },

  { id: 'region', label: 'Region', group: 'trip', source: 'redos',
    redosExpr: 'fo.region' },

  { id: 'service_type', label: 'Service Type', group: 'trip', source: 'both',
    redosExpr: 'fo.service_type',
    hbxExpr: 'fo.FULFILLMENT_SERVICE_NAME AS service_type' },

  { id: 'booking_type', label: 'Booking Type', group: 'trip', source: 'redos',
    redosExpr: 'fo.booking_type' },

  { id: 'order_source', label: 'Order Source', group: 'trip', source: 'both',
    redosExpr: 'fo.order_source',
    hbxExpr: 'fo.META_PLATFORM_NAME AS order_source' },

  { id: 'trip_status', label: 'Trip Status', group: 'trip', source: 'redos',
    redosExpr: 'fo.trip_status' },

  { id: 'payment_status', label: 'Payment Status', group: 'trip', source: 'both',
    redosExpr: 'fo.payment_status',
    hbxExpr: 'fo.PAYMENTS_PAYMENT_STATUS AS payment_status' },

  { id: 'cancellation_reason', label: 'Cancellation Reason', group: 'trip', source: 'redos',
    redosExpr: 'fo.order_cancellation_reason AS cancellation_reason' },

  { id: 'is_revenue', label: 'Is Revenue', group: 'trip', source: 'redos',
    redosExpr: 'fo.is_revenue' },

  { id: 'is_bill_to_client', label: 'Bill to Client', group: 'trip', source: 'redos',
    redosExpr: 'fo.is_bill_to_client' },

  { id: 'is_emergency', label: 'Is Emergency', group: 'trip', source: 'hbx',
    hbxExpr: 'fo.META_IS_EMERGENCY AS is_emergency' },

  { id: 'is_scheduled', label: 'Was Scheduled', group: 'operational', source: 'both',
    redosExpr: 'fo.oms_is_long_trip AS is_scheduled',
    hbxExpr: 'fo.META_IS_SCHEDULED AS is_scheduled' },

  { id: 'is_bill_to_patient', label: 'Bill to Patient', group: 'trip', source: 'hbx',
    hbxExpr: 'fo.META_IS_BILL_TO_PATIENT AS is_bill_to_patient' },

  // ─── TIMESTAMPS ───────────────────────────────────────────────────────────────
  { id: 'booking_created_at_ist', label: 'Booking Created At (IST)', group: 'timestamps', source: 'both',
    redosExpr: 'fo.order_created_at_ts_ist AS booking_created_at_ist',
    hbxExpr: 'CONVERT_TIMEZONE(\'UTC\', \'Asia/Kolkata\', fo.META_BOOKING_CREATED_AT_TIMESTAMP) AS booking_created_at_ist',
    transform: 'ist', defaultSelected: true },

  { id: 'fulfilled_at_ist', label: 'Fulfilled At (IST)', group: 'timestamps', source: 'both',
    redosExpr: 'fo.order_fulfilled_at_ts_ist AS fulfilled_at_ist',
    hbxExpr: 'CONVERT_TIMEZONE(\'UTC\', \'Asia/Kolkata\', fo.FULFILLMENT_CREATED_AT_TIMESTAMP) AS fulfilled_at_ist',
    transform: 'ist', defaultSelected: true },

  { id: 'dispatch_assigned_at_ist', label: 'Dispatch Assigned At (IST)', group: 'timestamps', source: 'both',
    redosExpr: 'fo.dispatch_assigned_at_ts_ist AS dispatch_assigned_at_ist',
    hbxExpr: 'CONVERT_TIMEZONE(\'UTC\', \'Asia/Kolkata\', fo.ASSIGNMENT_ASSIGNED_AT_TIMESTAMP) AS dispatch_assigned_at_ist',
    transform: 'ist' },

  { id: 'dispatch_triggered_at_ist', label: 'Dispatch Triggered At (IST)', group: 'timestamps', source: 'redos',
    redosExpr: 'fo.dispatch_triggered_at_ts_ist AS dispatch_triggered_at_ist', transform: 'ist' },

  { id: 'order_settled_at_ist', label: 'Order Settled At (IST)', group: 'timestamps', source: 'redos',
    redosExpr: 'fo.order_settled_at_ts_ist AS order_settled_at_ist', transform: 'ist' },

  { id: 'meta_created_at_ist', label: 'Created At (IST)', group: 'timestamps', source: 'hbx',
    hbxExpr: 'CONVERT_TIMEZONE(\'UTC\', \'Asia/Kolkata\', fo.META_CREATED_AT_TIMESTAMP) AS meta_created_at_ist',
    transform: 'ist' },

  { id: 'reached_pickup_at_ist', label: 'Reached Pickup At (IST)', group: 'timestamps', source: 'hbx',
    hbxExpr: 'CONVERT_TIMEZONE(\'UTC\', \'Asia/Kolkata\', fo.ASSIGNMENT_REACHED_AT_TIMESTAMP) AS reached_pickup_at_ist',
    transform: 'ist' },

  // ─── FLEET & VEHICLE ──────────────────────────────────────────────────────────
  { id: 'vehicle_type', label: 'Vehicle Type (ALS/BLS/Ecco)', group: 'fleet', source: 'both',
    redosExpr: 'fo.fleet_type_sent AS vehicle_type',
    hbxExpr: 'fo.ASSIGNMENT_AMBULANCE_TYPE AS vehicle_type',
    defaultSelected: true },

  { id: 'vehicle_category', label: 'Vehicle Category', group: 'fleet', source: 'hbx',
    hbxExpr: 'fo.ASSIGNMENT_AMBULANCE_CATEGORY AS vehicle_category' },

  { id: 'vehicle_type_requested', label: 'Vehicle Type Requested', group: 'fleet', source: 'redos',
    redosExpr: 'fo.fleet_type_requested AS vehicle_type_requested' },

  { id: 'ownership_type', label: 'Ownership Type (Own/Sathi/Alliance)', group: 'fleet', source: 'both',
    redosExpr: 'fo.fleet_ownership_type AS ownership_type',
    hbxExpr: 'fo.ASSIGNMENT_PROVIDER_TYPE AS ownership_type',
    defaultSelected: true },

  { id: 'fleet_license_number', label: 'Fleet Registration Number', group: 'fleet', source: 'both',
    redosExpr: 'fo.assigned_fleet_registration_number AS fleet_license_number',
    hbxExpr: 'fo.ASSIGNMENT_AMBULANCE_NUMBER AS fleet_license_number' },

  { id: 'assigned_fleet_id', label: 'Assigned Fleet ID', group: 'fleet', source: 'both',
    redosExpr: 'fo.assigned_fleet_id',
    hbxExpr: 'fo.ASSIGNMENT_AMBULANCE_ID AS assigned_fleet_id' },

  { id: 'fleet_tag', label: 'Fleet Tag', group: 'fleet', source: 'both',
    redosExpr: 'fo.fleet_tag',
    hbxExpr: 'fo.ASSIGNMENT_AMBULANCE_TAGS AS fleet_tag' },

  { id: 'fleet_owner_company', label: 'Fleet Owner Company', group: 'fleet', source: 'both',
    redosExpr: 'fo.fleet_owner_company_name AS fleet_owner_company',
    hbxExpr: 'fo.ASSIGNMENT_AMBULANCE_SERVICE_NAME AS fleet_owner_company' },

  { id: 'dispatch_type', label: 'Dispatch Type', group: 'operational', source: 'both',
    redosExpr: 'fo.dispatch_type',
    hbxExpr: 'fo.ASSIGNMENT_DISPATCH_TYPE AS dispatch_type' },

  { id: 'assignment_type', label: 'Assignment Type', group: 'operational', source: 'redos',
    redosExpr: 'fo.assignment_type' },

  // ─── PARTNER & SITE ───────────────────────────────────────────────────────────
  { id: 'partner_name', label: 'Partner Name', group: 'partner', source: 'both',
    redosExpr: 'fo.fleet_owner_company_name AS partner_name',
    hbxExpr: 'fo.ASSIGNMENT_AMBULANCE_SERVICE_NAME AS partner_name',
    defaultSelected: true },

  { id: 'site_id', label: 'Site ID', group: 'partner', source: 'hbx',
    hbxExpr: 'fo.META_SITE_ID AS site_id' },

  { id: 'fulfillment_hospital_id', label: 'Hospital ID', group: 'partner', source: 'hbx',
    hbxExpr: 'fo.FULFILLMENT_HOSPITAL_ID AS fulfillment_hospital_id' },

  // ─── FINANCE & PRICING ────────────────────────────────────────────────────────
  { id: 'total_price', label: 'Total Order Amount (Rs)', group: 'finance', source: 'hbx',
    hbxExpr: 'ROUND(fo.PAYMENTS_TOTAL_ORDER_AMOUNT / 100, 2) AS total_price_inr',
    transform: 'paise_to_rupees', defaultSelected: true },

  { id: 'amount_paid', label: 'Amount Paid (Rs)', group: 'finance', source: 'hbx',
    hbxExpr: 'ROUND(fo.PAYMENTS_AMOUNT_PAID / 100, 2) AS amount_paid_inr',
    transform: 'paise_to_rupees' },

  { id: 'amount_left', label: 'Amount Left (Rs)', group: 'finance', source: 'hbx',
    hbxExpr: 'ROUND(fo.PAYMENTS_AMOUNT_LEFT / 100, 2) AS amount_left_inr',
    transform: 'paise_to_rupees' },

  { id: 'original_price', label: 'Original Price (Rs)', group: 'finance', source: 'hbx',
    hbxExpr: 'ROUND(fo.FULFILLMENT_ORIGINAL_PRICE / 100, 2) AS original_price_inr',
    transform: 'paise_to_rupees' },

  { id: 'final_price', label: 'Final Price (Rs)', group: 'finance', source: 'hbx',
    hbxExpr: 'ROUND(fo.FULFILLMENT_FINAL_PRICE / 100, 2) AS final_price_inr',
    transform: 'paise_to_rupees' },

  { id: 'total_discount', label: 'Total Discount (Rs)', group: 'finance', source: 'hbx',
    hbxExpr: 'ROUND(fo.PAYMENTS_TOTAL_DISCOUNT / 100, 2) AS total_discount_inr',
    transform: 'paise_to_rupees' },

  { id: 'total_gst', label: 'Total GST (Rs)', group: 'finance', source: 'hbx',
    hbxExpr: 'ROUND(fo.PAYMENTS_TOTAL_GST / 100, 2) AS total_gst_inr',
    transform: 'paise_to_rupees' },

  { id: 'margin_percentage', label: 'Margin %', group: 'finance', source: 'hbx',
    hbxExpr: 'fo.FULFILLMENT_MARGIN_PERCENTAGE AS margin_percentage' },

  { id: 'margin_value', label: 'Margin Value (Rs)', group: 'finance', source: 'hbx',
    hbxExpr: 'ROUND(fo.FULFILLMENT_MARGIN_VALUE / 100, 2) AS margin_value_inr',
    transform: 'paise_to_rupees' },

  // ─── DISTANCE ─────────────────────────────────────────────────────────────────
  { id: 'pickup_dropoff_distance', label: 'Trip Distance (KM)', group: 'trip', source: 'both',
    redosExpr: 'ROUND(fo.pricing_pickup_dropoff_distance / 1000, 2) AS pickup_dropoff_distance_km',
    hbxExpr: 'fo.FULFILLMENT_DISTANCE_KM AS pickup_dropoff_distance_km',
    transform: 'meters_to_km' },

  { id: 'order_distance', label: 'Order Distance (KM)', group: 'trip', source: 'redos',
    redosExpr: 'ROUND(fo.order_distance / 1000, 2) AS order_distance_km', transform: 'meters_to_km' },

  { id: 'estimated_pickup_distance', label: 'Est Ambulance-Patient Distance (KM)', group: 'trip', source: 'redos',
    redosExpr: 'ROUND(fo.estimated_patient_pickup_distance / 1000, 2) AS estimated_pickup_distance_km', transform: 'meters_to_km' },

  // ─── RESPONSE METRICS ─────────────────────────────────────────────────────────
  { id: 'assign_to_wheel_time', label: 'Assign to Wheel Time (mins)', group: 'response_metrics', source: 'redos',
    redosExpr: 'rm.assign_to_wheel_time AS assign_to_wheel_time_mins' },

  { id: 'wheel_to_pickup_time', label: 'Wheel to Pickup Time (mins)', group: 'response_metrics', source: 'redos',
    redosExpr: 'rm.wheel_to_pickup_time AS wheel_to_pickup_time_mins' },

  { id: 'pickup_to_drop_time', label: 'Pickup to Drop Time (mins)', group: 'response_metrics', source: 'redos',
    redosExpr: 'rm.pickup_to_drop_time AS pickup_to_drop_time_mins' },

  { id: 'on_hold_duration', label: 'On Hold Duration (mins)', group: 'response_metrics', source: 'redos',
    redosExpr: 'rm.on_hold_duration_mins AS on_hold_duration_mins' },

  { id: 'overall_reliability_tag', label: 'Overall Reliability Tag', group: 'response_metrics', source: 'redos',
    redosExpr: 'rm.overall_reliability_tag AS overall_reliability_tag' },

  // ─── USER & ATTRIBUTION ───────────────────────────────────────────────────────
  { id: 'order_attribution', label: 'Order Attribution Email', group: 'user', source: 'redos',
    redosExpr: 'fo.order_attribution AS order_attribution_email' },

  { id: 'assigned_pilot', label: 'Assigned Pilot', group: 'user', source: 'redos',
    redosExpr: 'fo.assigned_pilot_username AS assigned_pilot' },

  { id: 'assigned_paramedic', label: 'Assigned Paramedic', group: 'user', source: 'redos',
    redosExpr: 'fo.assigned_paramedic_username AS assigned_paramedic' },

  { id: 'created_by_email', label: 'Created By Email', group: 'user', source: 'hbx',
    hbxExpr: 'fo.META_CREATED_BY AS created_by_email' },

  { id: 'platform_name', label: 'Platform Name', group: 'user', source: 'hbx',
    hbxExpr: 'fo.META_PLATFORM_NAME AS platform_name' },

  // ─── ORDER CLASSIFICATION ───────────────────────────────────────────────────
  { id: 'order_classification', label: 'Order Classification', group: 'trip', source: 'both',
    redosExpr: 'fo.order_classification AS order_classification',
    hbxExpr: 'fo.META_ORDER_CLASSIFICATION AS order_classification',
    description: 'INBOUND / OUTBOUND / TRANSFER / INTERNAL_TRANSFER / LAMA/DAMA',
    defaultSelected: true },

  // ─── PATIENT (BigQuery via stg_rdp.stg_order JOIN) ────────────────────────
  // Source: LEFT JOIN `redos-prod.stg_rdp.stg_order` s ON s.order_id = fo.order_id
  { id: 'bq_patient_name', label: 'Patient Name', group: 'patient', source: 'redos',
    redosExpr: 's.requested_for_name AS patient_name',
    description: 'From stg_order.requested_for_name' },

  { id: 'bq_attender_name', label: 'Attender Name', group: 'patient', source: 'redos',
    redosExpr: 's.requested_by_name AS attender_name',
    description: 'From stg_order.requested_by_name' },

  { id: 'bq_attender_mobile', label: 'Attender Mobile', group: 'patient', source: 'redos',
    redosExpr: 's.requested_by_mobile AS attender_mobile',
    description: 'From stg_order.requested_by_mobile' },

  { id: 'bq_patient_mobile', label: 'Patient Mobile', group: 'patient', source: 'redos',
    redosExpr: 's.requested_for_mobile AS patient_mobile',
    description: 'From stg_order.requested_for_mobile' },

  { id: 'bq_patient_age', label: 'Patient Age', group: 'patient', source: 'redos',
    redosExpr: 's.requested_for_age AS patient_age',
    description: 'From stg_order.requested_for_age' },

  { id: 'bq_patient_gender', label: 'Patient Gender', group: 'patient', source: 'redos',
    redosExpr: 's.requested_for_gender AS patient_gender',
    description: 'From stg_order.requested_for_gender' },

  { id: 'bq_caller_mobile', label: 'Caller Mobile', group: 'patient', source: 'redos',
    redosExpr: 's.mobile AS caller_mobile',
    description: 'From stg_order.mobile (caller who placed booking)' },

  { id: 'price_override_comments', label: 'Price Override Comments', group: 'finance', source: 'redos',
    redosExpr: "STRING_AGG(COALESCE(JSON_VALUE(p.comment), ''), ', ') AS price_override_comments",
    description: 'Requires paymentUpdationDetails unnest CTE' },

  { id: 'reports_order_source_name', label: 'Order Source Name', group: 'trip', source: 'redos',
    redosExpr: 'fo.reports_order_source_name AS reports_order_source_name',
    description: 'Hospital/source name as per reports' },

  { id: 'order_source_platform', label: 'Source Platform', group: 'trip', source: 'redos',
    redosExpr: 'fo.order_source_platform AS order_source_platform',
    description: 'Platform from which order was placed (app, web, call etc.)' },

  { id: 'bth_slip_url', label: 'BTH Slip URL', group: 'finance', source: 'redos',
    redosExpr: 'fo.bth_slip_url AS bth_slip_url',
    description: 'Bill to hospital slip URL' },

  { id: 'ip_signed_copy_url', label: 'IP Signed Copy URL', group: 'patient', source: 'redos',
    redosExpr: 'fo.ip_signed_copy_url AS ip_signed_copy_url',
    description: 'Inpatient signed copy document URL' },

  // ─── PATIENT ─────────────────────────────────────────────────────────────────
  // ── Caller Info (HBX only — not available in BigQuery) ──
  { id: 'caller_name', label: 'Caller Name', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.META_CALLER_NAME AS caller_name',
    description: 'Name of person who called/booked' },

  { id: 'caller_mobile', label: 'Caller Mobile', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.META_CALLER_MOBILE AS caller_mobile',
    description: 'Mobile number of caller' },

  // ── Patient Info ──
  { id: 'patient_name', label: 'Patient Name', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.META_PATIENT_NAME AS patient_name' },

  { id: 'patient_mobile', label: 'Patient Mobile', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.META_PATIENT_MOBILE AS patient_mobile' },

  { id: 'patient_age', label: 'Patient Age', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.META_PATIENT_AGE AS patient_age' },

  { id: 'patient_gender', label: 'Patient Gender', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.META_PATIENT_GENDER AS patient_gender' },

  { id: 'patient_weight', label: 'Patient Weight (kg)', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.META_PATIENT_WEIGHT AS patient_weight' },

  { id: 'patient_uhid', label: 'Patient UHID', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.PATIENT_UHID AS patient_uhid',
    description: 'Universal Health ID / Hospital patient ID' },

  { id: 'medical_symptoms', label: 'Medical Symptoms', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.META_MEDICAL_SYMPTOMS AS medical_symptoms' },

  // ── Crew Info (HBX) ──
  { id: 'pilot_name', label: 'Pilot / Driver Name', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.ASSIGNMENT_PRIMARYPILOTINFO_NAME AS pilot_name' },

  { id: 'pilot_phone', label: 'Pilot / Driver Phone', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.ASSIGNMENT_PRIMARYPILOTINFO_PHONE AS pilot_phone' },

  { id: 'paramedic_name', label: 'Paramedic Name', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.ASSIGNMENT_PRIMARYPARAMEDICINFO_NAME AS paramedic_name' },

  { id: 'paramedic_phone', label: 'Paramedic Phone', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.ASSIGNMENT_PRIMARYPARAMEDICINFO_PHONE AS paramedic_phone' },

  // ── Location (HBX) ──
  { id: 'fulfillment_pickup_lat', label: 'Pickup Latitude', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.FULFILLMENT_PICKUP_LATITUDE AS pickup_lat' },

  { id: 'fulfillment_pickup_lng', label: 'Pickup Longitude', group: 'patient', source: 'hbx',
    hbxExpr: 'fo.FULFILLMENT_PICKUP_LONGITUDE AS pickup_lng' },

  // ─── PATIENT (BigQuery / RedOS) ───────────────────────────────────────────
  // Note: Caller/attendant info is NOT stored in BigQuery fact_order.
  // Only operational patient fields are available.
  { id: 'ip_patient_number', label: 'IP Patient Number', group: 'patient', source: 'redos',
    redosExpr: 'fo.ipPatientNumber AS ip_patient_number',
    description: 'In-patient registration number' },

  { id: 'medical_reason', label: 'Medical Reason / Symptoms', group: 'patient', source: 'redos',
    redosExpr: 'fo.requested_for_medical_issue_reason_str AS medical_reason',
    description: 'Chief complaint / medical reason for trip' },

  { id: 'is_emergency', label: 'Is Emergency Case', group: 'patient', source: 'redos',
    redosExpr: 'fo.is_emergency_case AS is_emergency' },

  { id: 'pickup_address', label: 'Pickup Address', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_pickup_address_location AS pickup_address',
    description: 'Full pickup address' },

  { id: 'dropoff_address', label: 'Drop-off Address', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_dropoff_address_location AS dropoff_address',
    description: 'Full drop-off / destination address' },

  { id: 'dropoff_entity', label: 'Drop-off Hospital / Entity', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_dropoff_report_entity AS dropoff_entity',
    description: 'Hospital name at drop-off' },

  { id: 'pickup_entity', label: 'Pickup Hospital / Entity', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_pickup_report_entity AS pickup_entity',
    description: 'Hospital name at pickup' },

  { id: 'patient_pickup_eta_min', label: 'Patient Pickup ETA (min)', group: 'patient', source: 'redos',
    redosExpr: 'ROUND(fo.patient_pickup_eta / 60, 1) AS patient_pickup_eta_min', transform: 'none' },

  { id: 'patient_dropoff_eta_min', label: 'Patient Drop ETA (min)', group: 'patient', source: 'redos',
    redosExpr: 'ROUND(fo.patient_dropoff_eta / 60, 1) AS patient_dropoff_eta_min', transform: 'none' },

  { id: 'patient_handover_at_ist', label: 'Patient Handover Time (IST)', group: 'patient', source: 'redos',
    redosExpr: "FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', TIMESTAMP_MILLIS(fo.patient_handover_at), 'Asia/Kolkata') AS patient_handover_at_ist",
    transform: 'ist' },

  { id: 'assigned_paramedic', label: 'Assigned Paramedic', group: 'patient', source: 'redos',
    redosExpr: 'fo.assigned_paramedic_username AS assigned_paramedic' },

  { id: 'assigned_pilot', label: 'Assigned Pilot / Driver', group: 'patient', source: 'redos',
    redosExpr: 'fo.assigned_pilot_username AS assigned_pilot' },

  { id: 'patient_care_form', label: 'Patient Care Form Uploaded', group: 'patient', source: 'redos',
    redosExpr: 'fo.is_patient_care_form_uploaded AS patient_care_form' },

  { id: 'wp_pickup_lat', label: 'Pickup Latitude', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_pickup_lat AS pickup_lat' },

  { id: 'wp_pickup_lng', label: 'Pickup Longitude', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_pickup_long AS pickup_lng' },

  { id: 'wp_dropoff_lat', label: 'Drop-off Latitude', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_dropoff_lat AS dropoff_lat' },

  { id: 'wp_dropoff_lng', label: 'Drop-off Longitude', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_dropoff_long AS dropoff_lng' },

  // ─── PATIENT (BigQuery / RedOS) ───────────────────────────────────────────
  { id: 'ip_patient_number', label: 'IP Patient Number', group: 'patient', source: 'redos',
    redosExpr: 'fo.ipPatientNumber AS ip_patient_number',
    description: 'In-patient registration number' },

  { id: 'medical_reason', label: 'Medical Reason / Symptoms', group: 'patient', source: 'redos',
    redosExpr: 'fo.requested_for_medical_issue_reason_str AS medical_reason',
    description: 'Chief complaint / medical reason for trip' },

  { id: 'is_emergency', label: 'Is Emergency Case', group: 'patient', source: 'redos',
    redosExpr: 'fo.is_emergency_case AS is_emergency' },

  { id: 'pickup_address', label: 'Pickup Address', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_pickup_address_location AS pickup_address',
    description: 'Full pickup address' },

  { id: 'dropoff_address', label: 'Drop-off Address', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_dropoff_address_location AS dropoff_address',
    description: 'Full drop-off / destination address' },

  { id: 'dropoff_entity', label: 'Drop-off Hospital / Entity', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_dropoff_report_entity AS dropoff_entity',
    description: 'Hospital or entity name at drop-off' },

  { id: 'pickup_entity', label: 'Pickup Hospital / Entity', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_pickup_report_entity AS pickup_entity',
    description: 'Hospital or entity name at pickup' },

  { id: 'patient_pickup_eta_min', label: 'Patient Pickup ETA (min)', group: 'patient', source: 'redos',
    redosExpr: 'ROUND(fo.patient_pickup_eta / 60, 1) AS patient_pickup_eta_min',
    description: 'Estimated time to reach patient (minutes)', transform: 'none' },

  { id: 'patient_dropoff_eta_min', label: 'Patient Drop ETA (min)', group: 'patient', source: 'redos',
    redosExpr: 'ROUND(fo.patient_dropoff_eta / 60, 1) AS patient_dropoff_eta_min',
    description: 'Estimated time to reach destination (minutes)', transform: 'none' },

  { id: 'patient_handover_at_ist', label: 'Patient Handover Time (IST)', group: 'patient', source: 'redos',
    redosExpr: "FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', TIMESTAMP_MILLIS(fo.patient_handover_at), 'Asia/Kolkata') AS patient_handover_at_ist",
    description: 'Time patient was handed over at destination', transform: 'ist' },

  { id: 'assigned_paramedic', label: 'Assigned Paramedic', group: 'patient', source: 'redos',
    redosExpr: 'fo.assigned_paramedic_username AS assigned_paramedic' },

  { id: 'assigned_pilot', label: 'Assigned Pilot / Driver', group: 'patient', source: 'redos',
    redosExpr: 'fo.assigned_pilot_username AS assigned_pilot' },

  { id: 'patient_care_form', label: 'Patient Care Form Uploaded', group: 'patient', source: 'redos',
    redosExpr: 'fo.is_patient_care_form_uploaded AS patient_care_form' },

  { id: 'wp_pickup_lat', label: 'Pickup Latitude', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_pickup_lat AS pickup_lat' },

  { id: 'wp_pickup_lng', label: 'Pickup Longitude', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_pickup_long AS pickup_lng' },

  { id: 'wp_dropoff_lat', label: 'Drop-off Latitude', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_dropoff_lat AS dropoff_lat' },

  { id: 'wp_dropoff_lng', label: 'Drop-off Longitude', group: 'patient', source: 'redos',
    redosExpr: 'fo.wp_dropoff_long AS dropoff_lng' },

  // --- COMPUTED (always available; not stored, evaluated per row) ---
  { id: 'city_group', label: 'City Group', group: 'trip', source: 'both',
    redosExpr: `CASE
    WHEN fo.is_digital_lead = TRUE                                THEN 'DIGITAL'
    WHEN fo.city IN ('CHGL','VIPU')                               THEN 'CHN'
    WHEN fo.city IN ('GGN','GZD','FDB','NOI','DLH')               THEN 'DLH-NCR'
    WHEN fo.city IN ('MOHL','CDG','PCK')                          THEN 'Tri-City'
    WHEN fo.city = 'NMB'                                          THEN 'MUM'
    ELSE fo.city
  END AS city_group`,
    hbxExpr: `CASE
    WHEN UPPER(IFNULL(fo.META_VERTICAL_TYPE_CITY_DIGITAL_SEGG_CREATED,'')) = 'DIGITAL' THEN 'DIGITAL'
    WHEN fo.META_CITY IN ('CHGL','VIPU')                          THEN 'CHN'
    WHEN fo.META_CITY IN ('GGN','GZD','FDB','NOI','DLH')          THEN 'DLH-NCR'
    WHEN fo.META_CITY IN ('MOHL','CDG','PCK')                     THEN 'Tri-City'
    WHEN fo.META_CITY = 'NMB'                                     THEN 'MUM'
    ELSE fo.META_CITY
  END AS city_group`,
    description: 'City roll-up (NCR, Tri-City, digital-lead override)',
    defaultSelected: true },

  { id: 'department', label: 'Department', group: 'partner', source: 'redos',
    redosExpr: `CASE
    WHEN fo.order_attribution IN ('JSD','WBS','GGL','GGL-O','GGL-P','PTM')
         AND fo.order_attributed_to_role = 'Call Center Agent'
         AND c.partnership_type = 'Non-Partner Hospital'           THEN 'Digital'
    WHEN fo.order_attribution IN ('JSD','WBS','GGL','GGL-O','GGL-P','PTM')
         AND c.partnership_type = 'Partner Hospital'               THEN 'Hospital'
    WHEN fo.order_attribution IN ('RED','REDOS','NPH','SBE')
         OR REGEXP_CONTAINS(IFNULL(fo.order_attribution,''),'AIRCARGO')
                                                                   THEN 'Hospital'
    WHEN REGEXP_CONTAINS(IFNULL(fo.order_attribution,''),'REDFS')  THEN 'Field Sales'
    WHEN IFNULL(fo.order_attribution,'0') = '0'
         AND NOT REGEXP_CONTAINS(IFNULL(fo.reports_order_source_id,''),'RED')
         AND IFNULL(fo.reports_order_source_id,'0') != '0'         THEN 'Hospital'
    WHEN fo.order_attribution = 'TST'                              THEN 'Test Cases'
    ELSE 'Corporate and Others'
  END AS department`,
    description: 'Digital / Hospital / Field Sales / Corporate classification',
    defaultSelected: true },
];

export const COLUMN_GROUPS: Record<string, { label: string; icon: string; color: string }> = {
  trip:             { label: 'Trip Core',         icon: '🚑', color: '#ef4444' },
  timestamps:       { label: 'Timestamps',         icon: '🕐', color: '#f97316' },
  finance:          { label: 'Finance & Pricing',  icon: '💰', color: '#22c55e' },
  wallet:           { label: 'Wallet',             icon: '👛', color: '#10b981' },
  fleet:            { label: 'Fleet & Vehicle',    icon: '🚘', color: '#3b82f6' },
  partner:          { label: 'Partner & Site',     icon: '🏥', color: '#8b5cf6' },
  patient:          { label: 'Patient & Location', icon: '👤', color: '#ec4899' },
  operational:      { label: 'Operational',        icon: '⚙️', color: '#6b7280' },
  user:             { label: 'User Attribution',   icon: '👨‍💼', color: '#0ea5e9' },
  response_metrics: { label: 'Response Metrics',   icon: '📊', color: '#a78bfa' },
};

export function getColumnsForSource(source: 'redos' | 'hbx'): ColumnDef[] {
  return COLUMN_SCHEMA.filter(c => c.source === 'both' || c.source === source);
}

export function getColumnById(id: string): ColumnDef | undefined {
  return COLUMN_SCHEMA.find(c => c.id === id);
}
