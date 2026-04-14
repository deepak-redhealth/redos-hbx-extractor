// app/api/sites/route.ts â€” public endpoint that returns merged site list
// for the FilterPanel dropdown.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSitesCached } from '@/lib/sites';

export async function GET(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  try {
    const sites = await getSitesCached();
    // For the UI we only need display names; IDs stay on the server.
    return NextResponse.json({
      sites: sites.map(s => ({
        displayName: s.displayName,
        hasRedos: s.redosIds.length > 0,
        hasHbx: s.hbxIds.length > 0,
      })),
    });
  } catch (err: any) {
    console.error('[/api/sites] error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load sites' },
      { status: 500 }
    );
  }
}