// lib/bigquery.ts — BigQuery (RedOS) connector — DIAGNOSTIC BUILD
const GCP_PROJECT_ID_RE = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

function resolveProjectId(): string {
  const raw = (process.env.BIGQUERY_PROJECT_ID || 'redos-prod').trim();
  const id = raw.toLowerCase();
  if (!GCP_PROJECT_ID_RE.test(id)) {
    throw new Error(
      `Invalid BigQuery project ID "${raw}". Check BIGQUERY_PROJECT_ID env var — ` +
      `may have been set to a Snowflake DB name like "BLADE".`
    );
  }
  return id;
}

export async function executeRedosQuery(
  sql: string
): Promise<{ rows: Record<string, any>[]; rowCount: number }> {
  const projectId = resolveProjectId();

  // ── DIAGNOSTIC: dump every env var name whose value equals 'BLADE' ──
  const bladeVars = Object.entries(process.env)
    .filter(([_, v]) => v === 'BLADE')
    .map(([k]) => k);
  console.log('[bigquery diag] resolved projectId:', projectId);
  console.log('[bigquery diag] env vars currently set to "BLADE":', bladeVars);
  console.log('[bigquery diag] GCP-relevant env vars:', {
    BIGQUERY_PROJECT_ID:   process.env.BIGQUERY_PROJECT_ID,
    GOOGLE_CLOUD_PROJECT:  process.env.GOOGLE_CLOUD_PROJECT,
    GCLOUD_PROJECT:        process.env.GCLOUD_PROJECT,
    GCP_PROJECT:           process.env.GCP_PROJECT,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  // Force env vars BEFORE dynamic import
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT       = projectId;
  process.env.GCP_PROJECT          = projectId;

  const { BigQuery } = await import('@google-cloud/bigquery');
  const credBase64 = process.env.BIGQUERY_CREDENTIALS_BASE64;

  let client: any;
  if (credBase64) {
    const creds = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    console.log('[bigquery diag] creds type:', creds.type, '| creds project_id:', creds.project_id || '(none)');
    if (creds.project_id && creds.project_id !== projectId) {
      creds.project_id = projectId;
    }
    client = new BigQuery({ projectId, credentials: creds });
  } else {
    console.log('[bigquery diag] no BIGQUERY_CREDENTIALS_BASE64 — using ADC');
    client = new BigQuery({ projectId });
  }

  console.log('[bigquery diag] client.projectId after construction:', client.projectId);

  const timeoutMs = parseInt(process.env.QUERY_TIMEOUT_MS || '120000');
  try {
    const [rows] = await client.query({ query: sql, timeoutMs, useLegacySql: false });
    return { rows, rowCount: rows.length };
  } catch (err: any) {
    console.error('[bigquery diag] query failed — client.projectId:', client.projectId, '| error:', err?.message);
    throw err;
  }
}