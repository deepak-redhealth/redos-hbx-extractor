// app/api/agent/route.ts
// Full intelligent agentic loop — Claude reasons, inspects schema, writes SQL,
// executes on BigQuery + Snowflake, validates, retries, and summarizes.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { executeRedosQuery } from '@/lib/bigquery';
import { executeHbxQuery } from '@/lib/snowflake';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = 'claude-sonnet-4-6';

const TOOLS = [
  {
    name: 'inspect_schema',
    description: 'Get columns and data types for any table in BigQuery or Snowflake. Call this FIRST before writing SQL for any table you are unsure about.',
    input_schema: {
      type: 'object',
      properties: {
        db: { type: 'string', enum: ['redos', 'hbx'] },
        table: { type: 'string', description: 'Fully qualified table name' },
      },
      required: ['db', 'table'],
    },
  },
  {
    name: 'run_sql',
    description: 'Execute a SQL query on BigQuery (redos) or Snowflake (hbx). Always add LIMIT. If 0 rows, re-check filters and retry.',
    input_schema: {
      type: 'object',
      properties: {
        db: { type: 'string', enum: ['redos', 'hbx'] },
        sql: { type: 'string' },
        purpose: { type: 'string', description: 'What this query is finding out' },
      },
      required: ['db', 'sql', 'purpose'],
    },
  },
  {
    name: 'cross_db_join',
    description: 'Run queries on BOTH BigQuery and Snowflake and join the results in memory. Use when user needs data from both operational (RedOS) and finance (HBX) systems.',
    input_schema: {
      type: 'object',
      properties: {
        redos_sql: { type: 'string' },
        hbx_sql: { type: 'string' },
        join_key_redos: { type: 'string', description: 'Join column in RedOS result' },
        join_key_hbx: { type: 'string', description: 'Join column in HBX result' },
        purpose: { type: 'string' },
      },
      required: ['redos_sql', 'hbx_sql', 'join_key_redos', 'join_key_hbx', 'purpose'],
    },
  },
];

async function executeTool(name: string, input: any): Promise<string> {
  try {
    if (name === 'inspect_schema') {
      const { db, table } = input;
      if (db === 'redos') {
        const parts = table.replace(/`/g, '').split('.');
        const sql = `SELECT column_name, data_type FROM \`${parts[0]}.${parts[1]}.INFORMATION_SCHEMA.COLUMNS\` WHERE table_name = '${parts[2]}' ORDER BY ordinal_position LIMIT 100`;
        const { rows } = await executeRedosQuery(sql);
        if (!rows.length) return `No columns found for ${table}. Check the table name.`;
        return `Schema for ${table}:\n` + rows.map((r: any) => `  ${r.column_name}: ${r.data_type}`).join('\n');
      } else {
        const parts = table.split('.');
        const sql = `SELECT COLUMN_NAME, DATA_TYPE FROM ${parts[0]}.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${parts[1]}' AND TABLE_NAME = '${parts[2]}' ORDER BY ORDINAL_POSITION LIMIT 100`;
        const { rows } = await executeHbxQuery(sql);
        if (!rows.length) return `No columns found for ${table}. Check the table name.`;
        return `Schema for ${table}:\n` + rows.map((r: any) => `  ${r.COLUMN_NAME}: ${r.DATA_TYPE}`).join('\n');
      }
    }

    if (name === 'run_sql') {
      const { db, sql, purpose } = input;
      console.log(`[Agent] ${db.toUpperCase()} query: ${purpose}`);
      const executor = db === 'redos' ? executeRedosQuery : executeHbxQuery;
      const { rows, rowCount } = await executor(sql);
      if (!rows.length) return `0 rows returned. Filters may be too narrow or data doesn't exist for this period.\nSQL: ${sql}`;
      const preview = rows.slice(0, 200);
      const cols = Object.keys(preview[0]);
      const dataRows = preview.map((r: any) => cols.map(c => String(r[c] ?? '').substring(0, 40)).join(' | ')).join('\n');

      // Deterministic aggregates over ALL rows (not just preview) - prevents LLM arithmetic hallucination
      const fmtINR = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      const aggLines: string[] = [];
      for (const col of cols) {
        const vals = rows.map((r: any) => r[col]).filter((v: any) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v))).map((v: any) => Number(v));
        if (vals.length < Math.max(1, Math.floor(rows.length * 0.5))) continue; // skip cols that aren't mostly numeric
        const sum = vals.reduce((a: number, b: number) => a + b, 0);
        const avg = sum / vals.length;
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        aggLines.push(`  ${col}: sum=${fmtINR(sum)} | avg=${fmtINR(avg)} | min=${fmtINR(min)} | max=${fmtINR(max)} | n=${vals.length}`);
      }
      const aggBlock = aggLines.length
        ? `=== COMPUTED AGGREGATES (authoritative - use these EXACT values in your response, do NOT recompute) ===\nTotal rows: ${rowCount}\n${aggLines.join('\n')}\n=== END AGGREGATES ===\n\n`
        : '';

      return `${aggBlock}${rowCount} total rows (showing up to 200):\n${cols.join(' | ')}\n${'-'.repeat(60)}\n${dataRows}`;
    }

    if (name === 'cross_db_join') {
      const { redos_sql, hbx_sql, join_key_redos, join_key_hbx, purpose } = input;
      console.log(`[Agent] Cross-DB join: ${purpose}`);
      const [redosResult, hbxResult] = await Promise.all([executeRedosQuery(redos_sql), executeHbxQuery(hbx_sql)]);
      const hbxMap = new Map(hbxResult.rows.map((r: any) => [String(r[join_key_hbx]), r]));
      const joined = redosResult.rows.map((r: any) => {
        const hbxRow = hbxMap.get(String(r[join_key_redos]));
        return hbxRow ? { ...r, ...hbxRow } : null;
      }).filter(Boolean);
      if (!joined.length) return `0 matched rows. RedOS: ${redosResult.rowCount} rows, HBX: ${hbxResult.rowCount} rows. Check join keys: ${join_key_redos} ↔ ${join_key_hbx}`;
      const cols = Object.keys(joined[0]);
      const dataRows = joined.slice(0, 100).map((r: any) => cols.map(c => String((r as any)[c] ?? '').substring(0, 30)).join(' | ')).join('\n');
      return `Matched ${joined.length} rows across both DBs:\n${cols.join(' | ')}\n${dataRows}`;
    }

    return `Unknown tool: ${name}`;
  } catch (err: any) {
    return `Tool error: ${err.message}. Fix the SQL and retry.`;
  }
}

const SYSTEM_PROMPT = `You are an expert data analyst AI for Red Health — India's largest ambulance network.
You have direct SQL access to two data lakes. Think carefully, inspect schemas when needed, write correct SQL, and give clear answers.

DATABASES:
- BigQuery (redos): operational/funnel data. Main tables: \`redos-prod.rdp.fact_order\` (alias fo), \`redos-prod.rdp.response_metrics\` (rm), \`redos-prod.public.fleet_v2\` (flt), \`redos-prod.public.users_v2\` (ud), \`redos-prod.rdp.fact_call\`, \`redos-prod.rdp.fact_pilot_daily\`
- Snowflake (hbx): finance/billing data. Main tables: BLADE.CORE.RED_BLADE_ORDERS_FINAL (fo), BLADE.RAW.BLADE_TRANSACTIONS_DATA (tr), BLADE.CORE.BLADE_USER_ENTITIES_PARSED (ue), BLADE.CORE.BLADE_VEHICLES_DATA (vd), BLADE.CORE.BLADE_ORGANIZATION_ENTITIES_NEW_FLATTENED (og), BLADE.RAW.GENESYS_CALLS_RAW

CRITICAL RULES:
1. FUNNEL logic = filter by booking CREATION DATE. Finance logic = COALESCE(drop_date, fulfillment_date, creation_date)
2. HBX always add: WHERE fo.META_ORG_ID = '14927ff8-a1f6-49ba-abcb-7bb1cf842d52'
3. HBX always exclude: AND UPPER(COALESCE(fo.META_SPECIAL_CATEGORY,'')) NOT IN ('TEST CASE','TEST_CASE')
4. RedOS always add: WHERE fo.order_id NOT IN ('RED_V96L5J4X')
5. Amounts are in PAISE — divide by 100 for rupees
6. IST in HBX: CONVERT_TIMEZONE('UTC','Asia/Kolkata', col)
7. IST in RedOS: DATE(TIMESTAMP_MILLIS(epoch_col), 'Asia/Kolkata')
8. Vehicle types LOWERCASE: als, bls, ecco, hearse, neonatal
9. City codes in DB (not full names): HYD=Hyderabad, BLR=Bangalore, CHN/MAA=Chennai, BOM=Mumbai, DEL/NCR=Delhi, PNQ=Pune, CCU=Kolkata, NOI=Noida, GGN=Gurugram
   Always use UPPER(COALESCE(FULFILLMENT_CITY, META_CITY)) for city filter

10. PATIENT DATA IN BigQuery (RedOS):
    Table: 'redos-prod.stg_rdp.stg_order' — JOIN to fact_order on order_id
    Key columns:
    - requested_for_name → patient_name
    - requested_by_name  → attender_name
    - requested_by_mobile → attender_mobile
    - requested_for_mobile → patient_mobile
    - requested_for_age, requested_for_gender
    - mobile → caller_mobile
    Price override: CTE using UNNEST(fo.paymentUpdationDetails) AS p → JSON_VALUE(p.comment)
    Also in fact_order: reports_order_source_name, order_source_platform, bth_slip_url, ip_signed_copy_url

11. DATABASE ROUTING — CRITICAL BUSINESS RULE:
    - BigQuery (RedOS): ONLY has data UP TO Sep 30, 2025
    - Snowflake (HBX): ONLY has data FROM Oct 1, 2025 onwards
    - Overlap: Jul 15 – Sep 30, 2025 (both available)
    - TODAY is 2026 → ALL current queries MUST use HBX (Snowflake)
    - For historical data before Jul 2025 → use BigQuery
    - NEVER query BigQuery for dates after Sep 30, 2025

11. OWNERSHIP TYPE MAPPING:
    BigQuery values: 1P (Own), 2P (Sathi), 3P (Non-Sathi), Alliance
    Snowflake values: Own, Sathi, Non-Sathi, Alliance
    When user says "Own" or "1P" → use correct value for the DB being queried, BLR=Bangalore, CHN/MAA=Chennai, BOM=Mumbai, DEL/NCR=Delhi, PNQ=Pune, CCU=Kolkata, NOI=Noida, GGN=Gurugram
   Always use UPPER(COALESCE(FULFILLMENT_CITY, META_CITY)) for city filter — FULFILLMENT_CITY is NULL for in-progress orders, META_CITY covers all statuses
9. Agent email: COALESCE(META_BOOKING_CREATED_BY, META_ENQUIRY_CREATED_BY, META_CREATED_BY)
10. Always LIMIT queries — 500 for summaries, 5000 for detail
11. FINANCE revenue EXACT business logic (must match source of truth):
    - Date filter: COALESCE(TO_DATE(CONVERT_TIMEZONE('UTC','Asia/Kolkata', ASSIGNMENT_REACHEDDROPOFFAT_TIMESTAMP)), TO_DATE(FULFILLMENT_FULFILLED_AT_IST))
    - Exclude: META_ORDER_STATUS NOT IN ('CANCELLED','DISPUTED')
    - Exclude test: META_SPECIAL_CATEGORY IS NULL OR UPPER(META_SPECIAL_CATEGORY) NOT LIKE '%TEST%'
    - Revenue: CASE WHEN META_IS_FREE_TRIP = TRUE THEN 0 ELSE ROUND(IFNULL(PAYMENTS_TOTAL_ORDER_AMOUNT,0)/100,2) END
    - Never use FULFILLMENT_CREATED_AT_TIMESTAMP for finance — use FULFILLMENT_FULFILLED_AT_IST

WORKFLOW:
1. Parse the question — what metric, what dimension, what date range, funnel or finance?
2. Decide which DB (or both)
3. Inspect schema if unsure about column names
4. Write and run SQL
5. If 0 rows — diagnose why (wrong date? wrong filter?) and retry
6. Summarize findings clearly with numbers
7. Suggest a useful follow-up question

Always be direct. Lead with the answer, then the data.

CRITICAL - NUMERIC CORRECTNESS:
When a run_sql result includes a "=== COMPUTED AGGREGATES ===" block, those numbers are authoritative.
- Use them VERBATIM in your response - do not recompute, round, or re-derive.
- If the user asks for a total/sum/average, read it directly from the aggregates block.
- Never perform arithmetic on the displayed row preview - the preview is truncated to 200 rows; the aggregates block covers all rows.
- Format rupees by prepending the rune character (U+20B9) and the digit string from the aggregates.
- If you need a total that is not in the aggregates block (e.g. a sum filtered to a subset), issue another run_sql with SUM(...) rather than adding numbers yourself.
Violating this rule causes silent data corruption. The aggregates block is the single source of truth.`;

export async function POST(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  try {
    const { question, history = [] } = await req.json();
    if (!question?.trim()) return NextResponse.json({ error: 'Question is required' }, { status: 400 });

    const messages: any[] = [...history, { role: 'user', content: question }];
    const toolsUsed: any[] = [];
    let iterations = 0;

    while (iterations < 10) {
      iterations++;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: 4096, system: SYSTEM_PROMPT, tools: TOOLS, messages }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      messages.push({ role: 'assistant', content: data.content });

      if (data.stop_reason === 'end_turn') {
        const answer = data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
        return NextResponse.json({ answer, toolsUsed, iterations });
      }

      if (data.stop_reason === 'tool_use') {
        const toolResults: any[] = [];
        for (const block of data.content.filter((b: any) => b.type === 'tool_use')) {
          toolsUsed.push({ tool: block.name, purpose: block.input.purpose, db: block.input.db });
          const result = await executeTool(block.name, block.input);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
        messages.push({ role: 'user', content: toolResults });
      }
    }

    return NextResponse.json({ error: 'Max iterations reached' }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
