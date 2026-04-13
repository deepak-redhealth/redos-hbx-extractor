// lib/aiParser.ts — Smart AI Parser with clarification support

export type Intent = 'funnel' | 'finance' | 'trip' | 'attendance' | 'fleet' | 'calls' | 'auto';
export type QueryMode = 'detail' | 'summary' | 'count';

export interface ParsedIntent {
  intent: Intent;
  dataSource: 'redos' | 'hbx' | 'auto';
  queryMode: QueryMode;           // detail=row data, summary=GROUP BY aggregation, count=COUNT only
  aggregations?: {                // for summary mode
    metrics: AggMetric[];        // what to measure
    dimensions: AggDimension[];  // what to group by
  };
  filters: {
    status?: string[];
    vehicleType?: string[];
    ownershipType?: string[];
    city?: string[];
    dateRange?: {
      field: 'creation' | 'fulfillment';
      preset?: string;
      from?: string;
      to?: string;
      excludeToday?: boolean;
    };
    partner?: string[];
    minRevenue?: number;
    maxRevenue?: number;
    isScheduled?: boolean;
    createdByEmail?: string;
    excludeTestCases?: boolean;
  };
  suggestedColumns?: string[];
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  rawInput?: string;
  isCountQuery?: boolean;
  groupBy?: string[];
  confidence: number;
}

export type AggMetric = {
  fn: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
  field: string;
  alias: string;
};

export type AggDimension = {
  field: string;     // SQL expression
  alias: string;     // column alias
  label: string;     // human label
};

// ─── CLAUDE API SYSTEM PROMPT ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an intelligent data query assistant for Red Health — a medical ambulance dispatch company in India.

You have TWO data sources:
- RedOS (BigQuery): funnel/operational data — trip counts, dispatch times, fleet, pilots
- HBX (Snowflake): finance/billing data — revenue, payments, invoices, wallet, partner dues

KEY BUSINESS RULES:
- FUNNEL logic = filter by CREATION DATE (when booking was made)
- FINANCE logic = filter by COALESCE(drop_date, fulfillment_date, creation_date) — the latest event
- When user says "revenue", "billing", "payment", "invoice", "amount" → use HBX + finance date logic
- When user says "trips", "orders", "dispatch", "response time" → use RedOS + creation date logic
- "this month excluding today" → datePreset: "thismonth", excludeToday: true

DB VALUES (exact):
- Vehicle types (lowercase): als, bls, ecco, hearse, neonatal
- Statuses: COMPLETED, CANCELLED, IN_PROGRESS, CREATED, DISPUTED
- Ownership: Own, Sathi, Alliance, Others
- Cities: Hyderabad, Bangalore, Chennai, Mumbai, Delhi, Pune, Kolkata, Noida

QUERY MODES:
- "detail": row-by-row data (default)
- "summary": aggregated data with GROUP BY + metrics (use when user says "by date", "city-wise", "total", "sum", "average", "per day", "breakdown")
- "count": only COUNT(*) no other data

HBX COLUMN NAMES FOR AGGREGATIONS:
- Revenue/amount: PAYMENTS_TOTAL_ORDER_AMOUNT / 100 (convert paise to rupees)
- City: FULFILLMENT_CITY
- Date: DATE(CONVERT_TIMEZONE('UTC','Asia/Kolkata', COALESCE(ASSIGNMENT_REACHEDDROPOFFAT_TIMESTAMP, FULFILLMENT_CREATED_AT_TIMESTAMP, META_BOOKING_CREATED_AT_TIMESTAMP)))
- Vehicle: ASSIGNMENT_AMBULANCE_TYPE
- Partner: ASSIGNMENT_AMBULANCE_SERVICE_NAME
- Ownership: ASSIGNMENT_PROVIDER_TYPE
- Status: META_ORDER_STATUS
- Order ID: META_ORDER_ID
- Agent: COALESCE(META_BOOKING_CREATED_BY, META_ENQUIRY_CREATED_BY, META_CREATED_BY)

RedOS COLUMN NAMES FOR AGGREGATIONS:
- Revenue: price / 100
- City: city
- Date: DATE(TIMESTAMP_MILLIS(booking_created_by_epoch), 'Asia/Kolkata')
- Vehicle: fleet_type_sent
- Partner: fleet_owner_company_name
- Ownership: fleet_ownership_type
- Status: oms_order_status

WHEN TO ASK CLARIFICATION:
- Ask if intent is ambiguous (could be funnel or finance)
- Ask if date range is unclear
- Ask if metric is unclear (count vs revenue vs both?)
- Do NOT ask if query is clear enough to proceed

Respond ONLY with valid JSON, no markdown:
{
  "intent": "funnel|finance|trip|auto",
  "dataSource": "redos|hbx|auto",
  "queryMode": "detail|summary|count",
  "aggregations": {
    "metrics": [
      {"fn": "SUM", "field": "ROUND(fo.PAYMENTS_TOTAL_ORDER_AMOUNT/100,2)", "alias": "total_revenue_inr"},
      {"fn": "COUNT", "field": "fo.META_ORDER_ID", "alias": "order_count"}
    ],
    "dimensions": [
      {"field": "DATE(CONVERT_TIMEZONE('UTC','Asia/Kolkata', COALESCE(fo.ASSIGNMENT_REACHEDDROPOFFAT_TIMESTAMP, fo.FULFILLMENT_CREATED_AT_TIMESTAMP, fo.META_BOOKING_CREATED_AT_TIMESTAMP)))", "alias": "date", "label": "Date"}
    ]
  },
  "filters": {
    "status": null,
    "vehicleType": null,
    "ownershipType": null,
    "city": null,
    "dateRange": {"field": "fulfillment", "preset": "thismonth", "excludeToday": true},
    "minRevenue": null,
    "maxRevenue": null,
    "isScheduled": null,
    "createdByEmail": null,
    "excludeTestCases": true
  },
  "suggestedColumns": [],
  "clarificationNeeded": false,
  "clarificationQuestion": null,
  "confidence": 0.95
}

EXAMPLE — "date wise revenue as per finance logic for this month excluding today":
{
  "intent": "finance",
  "dataSource": "hbx",
  "queryMode": "summary",
  "aggregations": {
    "metrics": [
      {"fn": "SUM", "field": "ROUND(fo.PAYMENTS_TOTAL_ORDER_AMOUNT/100,2)", "alias": "total_revenue_inr"},
      {"fn": "COUNT", "field": "DISTINCT fo.META_ORDER_ID", "alias": "order_count"},
      {"fn": "AVG", "field": "ROUND(fo.PAYMENTS_TOTAL_ORDER_AMOUNT/100,2)", "alias": "avg_revenue_inr"}
    ],
    "dimensions": [
      {"field": "DATE(CONVERT_TIMEZONE('UTC','Asia/Kolkata', COALESCE(fo.ASSIGNMENT_REACHEDDROPOFFAT_TIMESTAMP, fo.FULFILLMENT_CREATED_AT_TIMESTAMP, fo.META_BOOKING_CREATED_AT_TIMESTAMP)))", "alias": "order_date", "label": "Date"}
    ]
  },
  "filters": {
    "dateRange": {"field": "fulfillment", "preset": "thismonth", "excludeToday": true},
    "excludeTestCases": true
  },
  "clarificationNeeded": false,
  "confidence": 0.97
}

EXAMPLE — "count of ALS trips city wise today" (ambiguous — funnel or finance?):
{
  "intent": "auto",
  "dataSource": "hbx",
  "queryMode": "count",
  "aggregations": {
    "metrics": [{"fn": "COUNT", "field": "fo.META_ORDER_ID", "alias": "trip_count"}],
    "dimensions": [{"field": "fo.FULFILLMENT_CITY", "alias": "city", "label": "City"}]
  },
  "filters": {"vehicleType": ["als"], "dateRange": {"field": "creation", "preset": "today"}},
  "clarificationNeeded": false,
  "confidence": 0.9
}

EXAMPLE — "show me revenue" (too vague):
{
  "intent": "finance",
  "dataSource": "hbx",
  "queryMode": "summary",
  "aggregations": null,
  "filters": {},
  "clarificationNeeded": true,
  "clarificationQuestion": "For revenue, I need a few details:\\n1. **Date range** — this month, last month, last 7 days?\\n2. **Breakdown** — by date, by city, by vehicle type, or total only?\\n3. **Filter** — specific city, vehicle type, or partner?",
  "confidence": 0.4
}`;

// ─── CLAUDE API CALL ──────────────────────────────────────────────────────────
export async function parseNaturalLanguage(userInput: string): Promise<ParsedIntent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'FILL_LATER' || apiKey.length < 20) {
    return smartFallbackParse(userInput);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20250714',
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userInput }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      intent:                parsed.intent                || 'auto',
      dataSource:            parsed.dataSource            || 'auto',
      queryMode:             parsed.queryMode             || 'detail',
      aggregations:          parsed.aggregations          || undefined,
      filters:               parsed.filters               || {},
      suggestedColumns:      parsed.suggestedColumns      || [],
      clarificationNeeded:   parsed.clarificationNeeded   || false,
      clarificationQuestion: parsed.clarificationQuestion || undefined,
      rawInput:              userInput,
      isCountQuery:          parsed.queryMode === 'count',
      groupBy:               parsed.aggregations?.dimensions?.map((d: AggDimension) => d.alias) || [],
      confidence:            parsed.confidence            || 0.85,
    };
  } catch (err) {
    console.error('Claude API failed, using fallback:', err);
    return smartFallbackParse(userInput);
  }
}

// ─── SMART FALLBACK PARSER ────────────────────────────────────────────────────
function smartFallbackParse(input: string): ParsedIntent {
  const t = input.toLowerCase().trim();

  const result: ParsedIntent = {
    intent: 'auto',
    dataSource: 'auto',
    queryMode: 'detail',
    filters: {},
    suggestedColumns: ['order_id', 'order_status', 'city', 'booking_created_at_ist'],
    confidence: 0.65,
    rawInput: input,
  };

  // ── INTENT & DATA SOURCE ──────────────────────────────────────────────────
  const financeWords = ['revenue', 'billing', 'payment', 'invoice', 'wallet', 'amount',
    'price', 'margin', 'gst', 'discount', 'paid', 'outstanding', 'finance', 'earning'];
  const funnelWords  = ['response time', 'dispatch time', 'wheel time', 'assign time',
    'funnel', 'atw', 'wtp', 'pickup time', 'drop time', 'operational'];
  const callWords    = ['call', 'ivr', 'genesys', 'inbound', 'outbound', 'talk time'];
  const attendWords  = ['attendance', 'shift', 'crew', 'leave', 'absent', 'present'];

  if (financeWords.some(w => t.includes(w))) {
    result.intent = 'finance';
    result.dataSource = 'hbx';
    result.filters.dateRange = { field: 'fulfillment', preset: 'thismonth' };
  } else if (funnelWords.some(w => t.includes(w))) {
    result.intent = 'funnel';
    result.dataSource = 'redos';
  } else if (callWords.some(w => t.includes(w))) {
    result.intent = 'calls' as Intent;
    result.dataSource = 'hbx';
  } else if (attendWords.some(w => t.includes(w))) {
    result.intent = 'attendance' as Intent;
    result.dataSource = 'redos';
  } else if (t.includes('booking') || t.includes('created') || t.includes('trip') || t.includes('order')) {
    result.intent = 'trip';
    result.dataSource = 'hbx';
  }

  // ── QUERY MODE — detect summary/aggregation ────────────────────────────────
  const summaryWords = ['total', 'sum', 'average', 'avg', 'breakdown', 'wise', 
    'per day', 'per city', 'per vehicle', 'by date', 'by city', 'by vehicle',
    'date wise', 'city wise', 'vehicle wise', 'partner wise', 'daily', 'summary'];
  const countWords   = ['count', 'how many', 'number of', 'tally'];

  if (countWords.some(w => t.includes(w)) && !financeWords.some(w => t.includes(w))) {
    result.queryMode = 'count';
    result.isCountQuery = true;
  } else if (summaryWords.some(w => t.includes(w))) {
    result.queryMode = 'summary';
  }

  // ── AGGREGATIONS for summary mode ─────────────────────────────────────────
  if (result.queryMode === 'summary' || result.queryMode === 'count') {
    const metrics: AggMetric[] = [];
    const dimensions: AggDimension[] = [];
    const isHbx = result.dataSource === 'hbx';

    // Metrics
    if (t.includes('revenue') || t.includes('amount') || t.includes('earning')) {
      metrics.push({ fn: 'SUM', field: isHbx ? 'ROUND(fo.PAYMENTS_TOTAL_ORDER_AMOUNT/100,2)' : 'ROUND(fo.price/100,2)', alias: 'total_revenue_inr' });
      metrics.push({ fn: 'AVG', field: isHbx ? 'ROUND(fo.PAYMENTS_TOTAL_ORDER_AMOUNT/100,2)' : 'ROUND(fo.price/100,2)', alias: 'avg_revenue_inr' });
    }
    metrics.push({ fn: 'COUNT', field: isHbx ? 'DISTINCT fo.META_ORDER_ID' : 'DISTINCT fo.order_id', alias: 'order_count' });

    // Dimensions
    if (t.match(/date.?wise|by date|per day|daily|day.?wise/))
      dimensions.push({ field: isHbx ? "DATE(CONVERT_TIMEZONE('UTC','Asia/Kolkata', COALESCE(fo.ASSIGNMENT_REACHEDDROPOFFAT_TIMESTAMP, fo.FULFILLMENT_CREATED_AT_TIMESTAMP, fo.META_BOOKING_CREATED_AT_TIMESTAMP)))" : "DATE(TIMESTAMP_MILLIS(fo.booking_created_by_epoch), 'Asia/Kolkata')", alias: 'order_date', label: 'Date' });
    if (t.match(/city.?wise|by city|per city/))
      dimensions.push({ field: isHbx ? 'fo.FULFILLMENT_CITY' : 'fo.city', alias: 'city', label: 'City' });
    if (t.match(/vehicle.?wise|by vehicle|vehicle.?type/))
      dimensions.push({ field: isHbx ? 'fo.ASSIGNMENT_AMBULANCE_TYPE' : 'fo.fleet_type_sent', alias: 'vehicle_type', label: 'Vehicle Type' });
    if (t.match(/partner.?wise|by partner/))
      dimensions.push({ field: isHbx ? 'fo.ASSIGNMENT_AMBULANCE_SERVICE_NAME' : 'fo.fleet_owner_company_name', alias: 'partner_name', label: 'Partner' });
    if (t.match(/ownership.?wise|by ownership/))
      dimensions.push({ field: isHbx ? 'fo.ASSIGNMENT_PROVIDER_TYPE' : 'fo.fleet_ownership_type', alias: 'ownership_type', label: 'Ownership' });
    if (t.match(/status.?wise|by status/))
      dimensions.push({ field: isHbx ? 'fo.META_ORDER_STATUS' : 'fo.oms_order_status', alias: 'status', label: 'Status' });
    if (t.match(/agent.?wise|by agent|created.?by/))
      dimensions.push({ field: isHbx ? "COALESCE(fo.META_BOOKING_CREATED_BY, fo.META_ENQUIRY_CREATED_BY, fo.META_CREATED_BY)" : 'fo.order_attribution', alias: 'agent_email', label: 'Agent' });

    if (metrics.length || dimensions.length) {
      result.aggregations = { metrics, dimensions };
    }
  }

  // ── STATUS ────────────────────────────────────────────────────────────────
  if (t.includes('complet') || t.includes('fulfil'))              result.filters.status = ['COMPLETED'];
  else if (t.includes('cancel'))                                   result.filters.status = ['CANCELLED'];
  else if (t.includes('in progress') || t.includes('ongoing'))    result.filters.status = ['IN_PROGRESS'];
  else if (t.includes('dispute'))                                  result.filters.status = ['DISPUTED'];

  // ── VEHICLE ────────────────────────────────────────────────────────────────
  const vehicles: string[] = [];
  if (/\bals\b/.test(t)) vehicles.push('als');
  if (/\bbls\b/.test(t)) vehicles.push('bls');
  if (/\becco\b/.test(t)) vehicles.push('ecco');
  if (t.includes('hearse')) vehicles.push('hearse');
  if (t.includes('neonatal')) vehicles.push('neonatal');
  if (vehicles.length) result.filters.vehicleType = vehicles;

  // ── OWNERSHIP — unified labels (queryBuilder maps to DB-specific values) ──
  // HBX: OWNED, SAATHI, NON_SAATHI, ALLIANCE | BQ: 1P, 2P, 3P
  if (t.includes('non-sathi') || t.includes('non sathi') || t.includes('3p') || t.includes('nonsathi'))
    result.filters.ownershipType = ['non-sathi'];
  else if (t.includes('sathi') || t.includes('2p'))
    result.filters.ownershipType = ['sathi'];
  else if (t.includes('alliance'))
    result.filters.ownershipType = ['alliance'];
  else if (t.includes('1p') || t.includes('owned') || (/\bown\b/.test(t) && !t.includes('owner')))
    result.filters.ownershipType = ['own'];

  // ── CITIES ───────────────────────────────────────────────────────────────
  const cityMap: Record<string,string> = {
    hyderabad:'Hyderabad', bangalore:'Bangalore', bengaluru:'Bangalore',
    chennai:'Chennai', mumbai:'Mumbai', delhi:'Delhi', pune:'Pune',
    kolkata:'Kolkata', noida:'Noida', gurugram:'Gurugram', gurgaon:'Gurugram',
  };
  const cities = [...new Set(Object.entries(cityMap).filter(([k])=>t.includes(k)).map(([,v])=>v))];
  if (cities.length) result.filters.city = cities;

  // ── DATE RANGE ────────────────────────────────────────────────────────────
  const dateField = (result.intent === 'finance') ? 'fulfillment' : 'creation';
  const excludeToday = t.includes('excluding today') || t.includes('exclude today') || t.includes('till yesterday');

  if (t.includes('today'))                        result.filters.dateRange = { field: dateField, preset: 'today' };
  else if (t.includes('yesterday'))               result.filters.dateRange = { field: dateField, preset: 'yesterday' };
  else if (t.match(/last\s*7|past\s*7/))          result.filters.dateRange = { field: dateField, preset: 'last7days', excludeToday };
  else if (t.match(/last\s*30|past\s*30/))        result.filters.dateRange = { field: dateField, preset: 'last30days', excludeToday };
  else if (t.match(/this\s*month|current\s*month/)) result.filters.dateRange = { field: dateField, preset: 'thismonth', excludeToday };
  else if (t.match(/last\s*month|previous\s*month/)) result.filters.dateRange = { field: dateField, preset: 'lastmonth', excludeToday };
  else if (!result.filters.dateRange)             result.filters.dateRange = { field: dateField, preset: 'last7days', excludeToday };

  // ── REVENUE FILTERS ────────────────────────────────────────────────────────
  const minMatch = t.match(/(?:revenue|amount|price)\s*(?:above|>|greater than|more than)\s*(?:rs\.?|₹)?\s*(\d+)/);
  if (minMatch) result.filters.minRevenue = parseInt(minMatch[1]);

  // ── CREATED BY ────────────────────────────────────────────────────────────
  const nameMatch = input.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/);
  const skipNames = new Set(['ALS','BLS','Own','Sathi','Alliance','Today','This','Last','Show','Get','Give','Find']);
  if (nameMatch && !skipNames.has(nameMatch[1])) {
    (result.filters as any).createdByEmail = nameMatch[1].toLowerCase();
    if (result.dataSource === 'auto') result.dataSource = 'hbx';
  }

  // ── EXCLUDE TEST CASES ────────────────────────────────────────────────────
  result.filters.excludeTestCases = true;

  // ── CLARIFICATION NEEDED ──────────────────────────────────────────────────
  // Ask clarification only if really ambiguous
  const hasDate = !!result.filters.dateRange?.preset;
  const hasMetric = result.intent !== 'auto';
  
  if (!hasDate && !hasMetric && t.split(' ').length < 4) {
    result.clarificationNeeded = true;
    result.clarificationQuestion = `I need a few more details to build this query:\n1. **Date range** — today, this month, last month, last 7 days?\n2. **Data type** — operational trips (funnel) or revenue/billing (finance)?\n3. **Breakdown** — do you want a summary (by date/city) or individual trip rows?`;
    result.confidence = 0.3;
  }

  result.suggestedColumns = [...new Set(result.suggestedColumns)];

  // ── AUTO DB ROUTING based on date ────────────────────────────────────────
  // BigQuery: data up to Sep 30, 2025 | Snowflake: Oct 1, 2025 onwards
  if (result.filters.dateRange?.from && result.filters.dateRange.from > '2025-09-30') {
    result.dataSource = 'hbx';
  } else if (result.filters.dateRange?.to && result.filters.dateRange.to < '2025-07-15') {
    result.dataSource = 'redos';
  } else if (result.filters.dateRange?.preset) {
    const preset = result.filters.dateRange.preset;
    // Recent presets (today, last7days, thismonth) → always HBX (post Oct 2025)
    if (['today','yesterday','last7days','last30days','thismonth'].includes(preset)) {
      result.dataSource = result.dataSource === 'auto' ? 'hbx' : result.dataSource;
    }
  }

  return result;
}
