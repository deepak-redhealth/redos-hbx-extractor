// lib/snowflake.ts
export async function executeHbxQuery(sql: string): Promise<{ rows: Record<string, any>[]; rowCount: number }> {
  const snowflake = await import('snowflake-sdk');

  let connectionConfig: any = {
    account:   process.env.SNOWFLAKE_ACCOUNT!,
    username:  process.env.SNOWFLAKE_USERNAME!,
    database:  process.env.SNOWFLAKE_DATABASE  || 'BLADE',
    schema:    process.env.SNOWFLAKE_SCHEMA    || 'CORE',
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'REPORTING_WH',
  };

  if (process.env.SNOWFLAKE_ROLE) {
    connectionConfig.role = process.env.SNOWFLAKE_ROLE;
  }

  // Auth priority: Base64 key (Vercel) → File path (local) → Password
  const base64Key = process.env.SNOWFLAKE_PRIVATE_KEY_BASE64;
  const keyPath   = process.env.SNOWFLAKE_PRIVATE_KEY_PATH;
  const password  = process.env.SNOWFLAKE_PASSWORD;

  if (base64Key) {
    // Vercel production — key stored as base64 env var
    const privateKey = Buffer.from(base64Key, 'base64').toString('utf8');
    connectionConfig.authenticator   = 'SNOWFLAKE_JWT';
    connectionConfig.privateKey      = privateKey;
    connectionConfig.privateKeyPass  = process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE || '';
  } else if (keyPath) {
    // Local dev — key stored as file path
    const fs = await import('fs');
    if (fs.existsSync(keyPath)) {
      const privateKey = fs.readFileSync(keyPath, 'utf8');
      connectionConfig.authenticator  = 'SNOWFLAKE_JWT';
      connectionConfig.privateKey     = privateKey;
      connectionConfig.privateKeyPass = process.env.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE || '';
    } else {
      throw new Error(`Snowflake private key file not found: ${keyPath}`);
    }
  } else if (password) {
    connectionConfig.password = password;
  } else {
    throw new Error('No Snowflake auth configured. Set SNOWFLAKE_PRIVATE_KEY_BASE64 (Vercel) or SNOWFLAKE_PRIVATE_KEY_PATH (local) or SNOWFLAKE_PASSWORD.');
  }

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
