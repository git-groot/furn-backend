import { Request, Response } from 'express';
import { db } from '../config/database';

export class HealthController {
  async getHealth(_req: Request, res: Response): Promise<void> {
    let isDbConnected = false;
    let dbError: string | null = null;

    try {
      const result = await db.query('SELECT 1 as health');
      isDbConnected = Boolean(result.rowCount && result.rowCount > 0);
    } catch (err: any) {
      isDbConnected = false;
      dbError = db.formatErrorMessage(err);
    }

    const healthStatus = {
      status: isDbConnected ? 'healthy' : 'degraded',
      service: 'myfurniture-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        connected: isDbConnected,
        provider: 'Neon Serverless PostgreSQL',
        ...(dbError ? { error: dbError } : {}),
      },
      system: {
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
      },
    };

    const statusCode = isDbConnected ? 200 : 503;
    res.status(statusCode).json({
      success: isDbConnected,
      data: healthStatus,
    });
  }
}

export const healthController = new HealthController();
