import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { getUnpooledDatabaseUrl } from '../config/env';
import { logger } from '../config/logger';
import { maskConnectionString } from '../utils/mask';

export const runMigrations = async (): Promise<void> => {
  const unpooledUrl = getUnpooledDatabaseUrl();
  logger.info(`🔄 Starting database migration runner using direct connection (${maskConnectionString(unpooledUrl)})...`);

  // Direct unpooled connection pool for DDL and transactional locking
  const pool = new Pool({
    connectionString: unpooledUrl,
    ssl: { rejectUnauthorized: true },
    max: 2,
    connectionTimeoutMillis: 10000,
  });

  try {
    // 1. Ensure migrations tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Read all .sql files in migrations directory
    const possibleDirs = [
      path.resolve(__dirname, '../../src/migrations'),
      path.resolve(__dirname, '../migrations'),
      path.resolve(__dirname),
    ];
    const migrationsDir =
      possibleDirs.find(
        (dir) => fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('.sql')),
      ) || path.resolve(__dirname);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} migration file(s)`);

    // 3. Fetch already applied migrations
    const applied = await pool.query<{ version: string }>(
      'SELECT version FROM schema_migrations',
    );
    const appliedSet = new Set(applied.rows.map((r) => r.version));

    // 4. Run pending migrations in transaction
    for (const file of files) {
      if (appliedSet.has(file)) {
        logger.info(`⏭️ Migration '${file}' already applied. Skipping.`);
        continue;
      }

      logger.info(`🚀 Executing migration '${file}'...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`✅ Migration '${file}' applied successfully.`);
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        throw migrationErr;
      } finally {
        client.release();
      }
    }

    logger.info('🎉 All database migrations are up to date.');
  } catch (error: any) {
    logger.error('❌ Migration failed:', error.message || error);
    throw error;
  } finally {
    await pool.end();
  }
};

// If executed directly from CLI
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
