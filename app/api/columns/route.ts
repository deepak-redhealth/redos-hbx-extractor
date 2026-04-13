// app/api/columns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { COLUMN_SCHEMA, COLUMN_GROUPS, getColumnsForSource } from '@/lib/columnSchema';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  const source = req.nextUrl.searchParams.get('source') as 'redos' | 'hbx' | null;
  const columns = source ? getColumnsForSource(source) : COLUMN_SCHEMA;

  return NextResponse.json({ columns, groups: COLUMN_GROUPS });
}
