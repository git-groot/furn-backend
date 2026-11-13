import compression from 'compression';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { setupSwagger } from './config/swagger';
import { healthController } from './controllers/health.controller';
import { errorHandler } from './middlewares/error.middleware';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware';
import { requestLogger } from './middlewares/requestLogger.middleware';
import routes from './routes';
import { NotFoundError } from './utils/errors';

export const createApp = (): Express => {
  const app = express();

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI inline scripts
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Cross-Origin Resource Sharing (CORS)
  app.use(
    cors({
      origin:
        env.CORS_ORIGIN === '*'
          ? true
          : [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
    }),
  );

  // 3. Response Compression
  app.use(compression());

  // 4. Request Parsers
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // 5. Request Logging & Rate Limiting
  app.use(requestLogger);
  app.use(globalRateLimiter);

  // 6. OpenAPI / Swagger Documentation
  setupSwagger(app);

  // 7. System Health Check
  app.get('/health', healthController.getHealth.bind(healthController));

  // 8. Mount REST APIs under /api/v1
  app.use(env.API_PREFIX, routes);

  // 9. Root Welcome Route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'MyFurniture REST API',
      version: '1.0.0',
      status: 'online',
      docs: '/api/docs',
      health: '/health',
      apiPrefix: env.API_PREFIX,
    });
  });

  // 10. Handle 404 for Unmatched Routes
  app.use((req: Request, _res: Response, next) => {
    next(new NotFoundError(`Endpoint '${req.method} ${req.originalUrl}' not found`));
  });

  // 11. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
