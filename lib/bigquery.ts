// lib/bigquery.ts — BigQuery (RedOS) connector
// NO singleton — create fresh client each time to avoid stale cached projectId

export async function executeRedosQuery(sql: string): Promise<{ rows: Record<string, any>[]; rowCount: number }> {
  const { BigQuery } = await import('@google-cloud/bigquery');
  
  const projectId = 'redos-prod';
  const credBase64 = process.env.BIGQUERY_CREDENTIALS_BASE64;
  
  let client: any;
  if (credBase64) {
    const creds = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    client = new BigQuery({ projectId, credentials: creds });
  } else {
    client = new BigQuery({ projectId });
  }

  const timeoutMs = parseInt(process.env.QUERY_TIMEOUT_MS || '120000');
  const [rows] = await client.query({ query: sql, timeoutMs, useLegacySql: false });
  return { rows, rowCount: rows.length };
}