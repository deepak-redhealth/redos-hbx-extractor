import { NextRequest, NextResponse } from 'next/server';
import { buildQuery } from '@/lib/queryBuilder';
import { parseNaturalLanguage } from '@/lib/aiParser';
import { executeRedosQuery } from '@/lib/bigquery';
import { executeHbxQuery } from '@/lib/snowflake';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { selectedColumns, uiFilters, naturalLanguageInput, dataSource, maxRows } = body;

    if (!dataSource || !['redos', 'hbx'].includes(dataSource)) {
      return NextResponse.json({ error: 'Invalid dataSource' }, { status: 400 });
    }

    let aiParsed;
    if (naturalLanguageInput?.trim()) {
      aiParsed = await parseNaturalLanguage(naturalLanguageInput);
    }

    const { sql, selectedColumnDefs, appliedFilters, warnings, isCountQuery } = buildQuery({
      selectedColumns,
      uiFilters: uiFilters || {},
      aiParsed,
      dataSource,
      maxRows: maxRows || 50000,
      countOnly: aiParsed?.isCountQuery || false,
    });

    const startTime = Date.now();
    let rows: Record<string, any>[];
    let rowCount: number;

    if (dataSource === 'redos') {
      ({ rows, rowCount } = await executeRedosQuery(sql));
    } else {
      ({ rows, rowCount } = await executeHbxQuery(sql));
    }

    const executionMs = Date.now() - startTime;

    return NextResponse.json({
      isCountQuery,
      rows: rows.slice(0, 1000),
      totalRows: rowCount,
      executionMs,
      appliedFilters,
      warnings,
      columnDefs: selectedColumnDefs,
      hasMore: rowCount > 1000,
      previewOnly: rowCount > 1000,
    });
  } catch (err: any) {
    console.error('Execute error:', err);
    return NextResponse.json({ error: err.message || 'Query execution failed' }, { status: 500 });
  }
}