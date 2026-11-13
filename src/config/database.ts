import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';
import { logger } from './logger';
import { maskConnectionString } from '../utils/mask';

export class Database {
  private static instance: Database;
  private pool: Pool;
  private isConnected = false;

  private constructor() {
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: true,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle pool 'error' events so an idle-connection drop does not crash the process
    this.pool.on('error', (err) => {
      logger.warn(
        '⚠️ Notice on idle PostgreSQL connection (will be safely reconnected on next query):',
        err.message,
      );
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error: any) {
      logger.error('Database query error:', {
        text,
        error: this.formatErrorMessage(error),
      });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Diagnostic mapper providing human-readable troubleshooting guidance for common Neon connection issues.
   */
  public formatErrorMessage(error: any): string {
    const msg = error?.message || String(error);
    const code = error?.code;

    // Wrong password / auth failure
    if (code === '28P01' || msg.toLowerCase().includes('password authentication failed')) {
      return 'PostgreSQL authentication failed: invalid username or password in DATABASE_URL.';
    }

    // Wrong database name
    if (code === '3D000' || msg.toLowerCase().includes('does not exist')) {
      return 'Target database does not exist in your Neon project. Check the database name in DATABASE_URL or create it in your Neon dashboard.';
    }

    // Missing or invalid SSL mode
    if (
      msg.includes('SSL') ||
      msg.includes('sslmode') ||
      msg.includes('no pg_hba.conf entry') ||
      code === '28000'
    ) {
      return 'Neon serverless requires SSL. Ensure your connection string includes "?sslmode=require".';
    }

    // Network timeout or host unreachable (e.g. cold start overrun or DNS failure)
    if (
      code === 'ETIMEDOUT' ||
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      msg.toLowerCase().includes('timeout')
    ) {
      return `Network timeout connecting to Neon (${code || 'TIMEOUT'}). Check network connectivity and verify the Neon endpoint hostname.`;
    }

    return msg;
  }

  /**
   * Connects to Neon with automatic retry & exponential backoff
   * to accommodate suspended serverless compute wake-up latency.
   */
  public async testConnection(maxRetries = 3, initialDelayMs = 1500): Promise<boolean> {
    const maskedUrl = maskConnectionString(env.DATABASE_URL);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await this.query('SELECT 1 as health');
        if (res.rows.length > 0) {
          this.isConnected = true;
          logger.info(`✅ Neon serverless PostgreSQL connected successfully (${maskedUrl})`);
          return true;
        }
      } catch (error: any) {
        this.isConnected = false;
        const readableReason = this.formatErrorMessage(error);

        if (attempt < maxRetries) {
          const delay = initialDelayMs * Math.pow(2, attempt - 1);
          logger.warn(
            `⏳ Neon connection attempt ${attempt}/${maxRetries} failed: ${readableReason}. Waking up compute, retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error(`❌ All ${maxRetries} connection attempts to Neon failed: ${readableReason}`);
          throw new Error(readableReason);
        }
      }
    }
    return false;
  }

  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }

  public checkHealth(): boolean {
    return this.isConnected;
  }
}

export const db = Database.getInstance();
