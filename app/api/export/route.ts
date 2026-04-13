// app/api/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildQuery } from '@/lib/queryBuilder';
import { parseNaturalLanguage } from '@/lib/aiParser';
import { executeRedosQuery } from '@/lib/bigquery';
import { executeHbxQuery } from '@/lib/snowflake';
import { exportData } from '@/lib/exportEngine';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { selectedColumns, uiFilters, naturalLanguageInput, dataSource, format = 'xlsx', maxRows } = body;

    if (!['csv', 'xlsx'].includes(format)) {
      return NextResponse.json({ error: 'Format must be csv or xlsx' }, { status: 400 });
    }

    let aiParsed;
    if (naturalLanguageInput?.trim()) {
      aiParsed = await parseNaturalLanguage(naturalLanguageInput);
    }

    const { sql, selectedColumnDefs, appliedFilters } = buildQuery({
      selectedColumns,
      uiFilters: uiFilters || {},
      aiParsed,
      dataSource,
      maxRows: maxRows || parseInt(process.env.MAX_ROWS || '50000'),
    });

    // Execute
    let rows: Record<string, any>[];
    if (dataSource === 'redos') {
      ({ rows } = await executeRedosQuery(sql));
    } else {
      ({ rows } = await executeHbxQuery(sql));
    }

    const { buffer, contentType, filename } = await exportData(
      rows,
      selectedColumnDefs,
      format as 'csv' | 'xlsx'
    );

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Row-Count': String(rows.length),
        'X-Applied-Filters': appliedFilters.join(' | '),
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
