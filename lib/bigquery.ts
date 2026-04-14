// lib/bigquery.ts — BigQuery (RedOS) connector
// Hardened against accidental "BLADE" project-ID pickup from Snowflake env vars.
//
// The @google-cloud/bigquery SDK auto-detects the project ID from several sources
// in this order:
//   1. explicit options.projectId         (what we pass in)
//   2. credentials JSON .project_id       (from BIGQUERY_CREDENTIALS_BASE64)
//   3. env: GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT / GCP_PROJECT
//   4. gcloud metadata service (not on Vercel)
//
// If ANY of 2-4 returns an invalid value like "BLADE" (which is our Snowflake DB
// name), the SDK will still validate it and throw before our explicit projectId
// takes effect in some code paths. So we normalize everything below.

const GCP_PROJECT_ID_RE = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

function resolveProjectId(): string {
  const raw = (process.env.BIGQUERY_PROJECT_ID || 'redos-prod').trim();
  const id = raw.toLowerCase();
  if (!GCP_PROJECT_ID_RE.test(id)) {
    throw new Error(
      `Invalid BigQuery project ID "${raw}". GCP project IDs must be 6–30 ` +
      `lowercase letters/digits/dashes, start with a letter, and not end with a dash. ` +
      `Check the BIGQUERY_PROJECT_ID env var on Vercel — it may have been set to a ` +
      `Snowflake database name (e.g. "BLADE") by mistake.`
    );
  }
  return id;
}

export async function executeRedosQuery(
  sql: string
): Promise<{ rows: Record<string, any>[]; rowCount: number }> {
  const projectId = resolveProjectId();

  // Force env vars BEFORE dynamic import so the SDK doesn't auto-detect a
  // stray value like "BLADE" from an unrelated Snowflake-related env var.
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT       = projectId;
  process.env.GCP_PROJECT          = projectId;

  const { BigQuery } = await import('@google-cloud/bigquery');
  const credBase64 = process.env.BIGQUERY_CREDENTIALS_BASE64;

  let client: any;
  if (credBase64) {
    const creds = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    // Defensive: if the service-account JSON has project_id embedded and it
    // doesn't match, align it so the SDK doesn't prefer the cred value.
    if (creds.project_id && creds.project_id !== projectId) {
      // eslint-disable-next-line no-console
      console.warn(
        `[bigquery] credentials project_id="${creds.project_id}" differs from ` +
        `resolved projectId="${projectId}"; overriding with resolved value.`
      );
      creds.project_id = projectId;
    }
    client = new BigQuery({ projectId, credentials: creds });
  } else {
    client = new BigQuery({ projectId });
  }

  const timeoutMs = parseInt(process.env.QUERY_TIMEOUT_MS || '120000');
  const [rows] = await client.query({ query: sql, timeoutMs, useLegacySql: false });
  return { rows, rowCount: rows.length };
}