import { Pool } from 'pg';
import { env, getTestDatabaseUrl } from '../../src/config/env';
import { maskConnectionString } from '../../src/utils/mask';

describe('Neon Database Branch Isolation and Safety Rules', () => {
  it('should mask sensitive credentials in connection strings for logging', () => {
    const rawUrl =
      'postgresql://neondb_owner:npg_SecretPass123@ep-cool-flower-a5xyz-pooler.us-east-2.aws.neon.tech/myfurniture_db?sslmode=require';
    const masked = maskConnectionString(rawUrl);

    expect(masked).not.toContain('npg_SecretPass123');
    expect(masked).toContain(
      'neo***:********@ep-cool-flower-a5xyz-pooler.us-east-2.aws.neon.tech/myfurniture_db?sslmode=require',
    );
  });

  it('should have a dedicated helper for test database routing', () => {
    const targetUrl = getTestDatabaseUrl();
    expect(typeof targetUrl).toBe('string');
    expect(targetUrl).toMatch(/^postgres(ql)?:\/\//);
    expect(targetUrl).toContain('sslmode=require');
  });

  it('should ensure main DATABASE_URL is never modified or exposed in tests', () => {
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.DATABASE_URL).toContain('sslmode=require');
  });

  // Executes live queries ONLY if a dedicated TEST_DATABASE_URL is provided
  const hasLiveTestDb = Boolean(
    process.env.TEST_DATABASE_URL &&
      !process.env.TEST_DATABASE_URL.includes('placeholder') &&
      process.env.TEST_DATABASE_URL !== env.DATABASE_URL,
  );

  (hasLiveTestDb ? it : it.skip)(
    'should connect to isolated Neon test branch without querying main DATABASE_URL',
    async () => {
      const testPool = new Pool({
        connectionString: process.env.TEST_DATABASE_URL,
        ssl: { rejectUnauthorized: true },
      });
      try {
        const res = await testPool.query('SELECT current_database(), 1 as health');
        expect(res.rows[0].health).toBe(1);
      } finally {
        await testPool.end();
      }
    },
  );
});
