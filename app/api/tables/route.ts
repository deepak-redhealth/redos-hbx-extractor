// app/api/tables/route.ts — Returns full table catalog
import { NextRequest, NextResponse } from 'next/server';
import { getTablesForDb, TABLE_CATEGORIES } from '@/lib/tableCatalog';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  const db = req.nextUrl.searchParams.get('db') as 'redos' | 'hbx' | null;
  const tables = db ? getTablesForDb(db) : [...getTablesForDb('redos'), ...getTablesForDb('hbx')];

  return NextResponse.json({ tables, categories: TABLE_CATEGORIES });
}
