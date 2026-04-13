// lib/snowflake.ts

export async function executeHbxQuery(sql: string): Promise<{ rows: Record<string, any>[]; rowCount: number }> {
  const snowflake = await import('snowflake-sdk');
  const fs = await import('fs');

  const privateKeyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH;
  const password = process.env.SNOWFLAKE_PASSWORD;

  let connectionConfig: any = {
    account:   process.env.SNOWFLAKE_ACCOUNT!,
    username:  process.env.SNOWFLAKE_USERNAME!,
    database:  process.env.SNOWFLAKE_DATABASE || 'BLADE',
    schema:    process.env.SNOWFLAKE_SCHEMA   || 'CORE',
    warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
  };

  if (process.env.SNOWFLAKE_ROLE) {
    connectionConfig.role = process.env.SNOWFLAKE_ROLE;
  }

  if (privateKeyPath && fs.existsSync(privateKeyPath)) {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    connectionConfig.authenticator = 'SNOWFLAKE_JWT';
    connectionConfig.privateKey = privateKey;
    connectionConfig.privateKeyPass = '';
  } else if (password) {
    connectionConfig.password = password;
  } else {
    throw new Error('No Snowflake auth configured.');
  }

  // Suppress noisy SDK logs
  (snowflake as any).configure({ logLevel: 'ERROR' });

  const connection = snowflake.createConnection(connectionConfig);

  return new Promise((resolve, reject) => {
    connection.connect((err: any) => {
      if (err) return reject(new Error(`Snowflake connect failed: ${err.message}`));
      connection.execute({
        sqlText: sql,
        complete: (err: any, _stmt: any, rows: any[] | undefined) => {
          connection.destroy(() => {});
          if (err) return reject(new Error(`Snowflake query failed: ${err.message}`));
          resolve({ rows: rows ?? [], rowCount: (rows ?? []).length });
        },
      });
    });
  });
}