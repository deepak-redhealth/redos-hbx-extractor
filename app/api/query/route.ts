// app/api/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildQuery, QueryBuilderInput } from '@/lib/queryBuilder';
import { parseNaturalLanguage } from '@/lib/aiParser';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { selectedColumns, uiFilters, naturalLanguageInput, dataSource, maxRows } = body;

    if (!dataSource || !['redos', 'hbx'].includes(dataSource)) {
      return NextResponse.json({ error: 'dataSource must be "redos" or "hbx"' }, { status: 400 });
    }

    if (!selectedColumns?.length) {
      return NextResponse.json({ error: 'At least one column must be selected' }, { status: 400 });
    }

    // Parse natural language if provided
    let aiParsed;
    if (naturalLanguageInput?.trim()) {
      aiParsed = await parseNaturalLanguage(naturalLanguageInput);
    }

    const input: QueryBuilderInput = {
      selectedColumns,
      uiFilters: uiFilters || {},
      aiParsed,
      dataSource,
      maxRows: maxRows || parseInt(process.env.MAX_ROWS || '50000'),
      countOnly: aiParsed?.isCountQuery || false,
    };

    const result = buildQuery(input);

    return NextResponse.json({
      sql: result.sql,
      dataSource: result.dataSource,
      appliedFilters: result.appliedFilters,
      warnings: result.warnings,
      columnCount: result.selectedColumnDefs.length,
      isCountQuery: result.isCountQuery,
      aiParsed: aiParsed || null,
    });
  } catch (err: any) {
    console.error('Query build error:', err);
    return NextResponse.json({ error: err.message || 'Query build failed' }, { status: 500 });
  }
}
