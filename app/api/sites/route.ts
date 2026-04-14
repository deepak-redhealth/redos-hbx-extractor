import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSitesCached } from '@/lib/sites';

export async function GET(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;
  try {
    const sites = await getSitesCached();
    return NextResponse.json({
      sites: sites.map(s => ({ displayName: s.displayName, hasRedos: !!s.redosId, hasHbx: !!s.hbxId })),
    });
  } catch (err: any) {
    console.error('[/api/sites] error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load sites' }, { status: 500 });
  }
}
