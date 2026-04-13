// lib/bigquery.ts — BigQuery (RedOS) connector
let bqClient: any = null;

async function getClient() {
  if (bqClient) return bqClient;
  const { BigQuery } = await import('@google-cloud/bigquery');

  // ALWAYS hardcode projectId — never let SDK auto-detect from env vars
  // (it picks up SNOWFLAKE_DATABASE=BLADE otherwise)
  const projectId = 'redos-prod';
  const credBase64 = process.env.BIGQUERY_CREDENTIALS_BASE64;

  if (credBase64) {
    const creds = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    bqClient = new BigQuery({ projectId, credentials: creds });
  } else {
    bqClient = new BigQuery({ projectId });
  }
  return bqClient;
}

export async function executeRedosQuery(sql: string): Promise<{ rows: Record<string, any>[]; rowCount: number }> {
  const client = await getClient();
  const timeoutMs = parseInt(process.env.QUERY_TIMEOUT_MS || '120000');
  const [rows] = await client.query({ query: sql, timeoutMs, useLegacySql: false });
  return { rows, rowCount: rows.length };
}