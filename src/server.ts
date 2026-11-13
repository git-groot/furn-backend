import http from 'http';
import { createApp } from './app';
import { db } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { runMigrations } from './migrations/migrate';
import { seedIfEmpty } from './seeds/seed';
import { maskConnectionString } from './utils/mask';

const startServer = async (): Promise<http.Server> => {
  try {
    // Step a: Load and validate env
    logger.info('⚙️ Step a: Environment configuration loaded and validated.');

    // Step b: Connect to Neon and run a SELECT 1 health check
    const maskedUrl = maskConnectionString(env.DATABASE_URL);
    logger.info(`🔌 Step b: Connecting to Neon serverless database (${maskedUrl}) and verifying health...`);
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Neon serverless database.');
    }

    // Step c: Run pending migrations (development only, or when RUN_MIGRATIONS_ON_START=true)
    const shouldRunMigrations = env.NODE_ENV === 'development' || env.RUN_MIGRATIONS_ON_START;
    if (shouldRunMigrations) {
      logger.info('🚀 Step c: Applying pending database migrations...');
      await runMigrations();
    } else {
      logger.info('⏩ Step c: Production mode without RUN_MIGRATIONS_ON_START, skipping automatic migrations on startup.');
    }

    // Step d: Seed (development only, idempotent)
    if (env.NODE_ENV === 'development') {
      logger.info('🌱 Step d: Checking development seed status...');
      await seedIfEmpty();
    } else {
      logger.info('⏩ Step d: Non-development environment, skipping seed script.');
    }

    // Step e: Start the Express server
    logger.info('🌐 Step e: Launching Express HTTP application...');
    const app = createApp();
    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      logger.info(`🚀 MyFurniture Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📖 OpenAPI Docs available at http://localhost:${env.PORT}/api/docs`);
      logger.info(`🩺 Health check available at http://localhost:${env.PORT}/health`);
    });

    // Graceful Shutdown Handlers
    const gracefulShutdown = (signal: string) => {
      logger.info(`⚠️ Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await db.close();
          logger.info('✅ Graceful shutdown completed. Exiting.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force exit after 10s if graceful shutdown hangs
      setTimeout(() => {
        logger.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('💥 Unhandled Rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });

    return server;
  } catch (error: any) {
    const readableReason = db.formatErrorMessage(error);
    logger.error(`💥 Startup sequence failed: ${readableReason}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default startServer;
