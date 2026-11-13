import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import { maskConnectionString } from '../utils/mask';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const validateNeonUrl = (val: string): boolean => {
  try {
    const parsed = new URL(val);
    const validProtocol = parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
    const hasSslMode = parsed.searchParams.get('sslmode') === 'require';
    return validProtocol && hasSslMode;
  } catch {
    return false;
  }
};

const neonUrlSchema = z.string().refine(validateNeonUrl, {
  message:
    'Database connection string must be a valid postgresql:// or postgres:// URL and must include "?sslmode=require"',
});

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Neon Database Connection Strings
  DATABASE_URL: neonUrlSchema,
  DATABASE_URL_UNPOOLED: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || validateNeonUrl(val), {
      message:
        'DATABASE_URL_UNPOOLED must be a valid postgresql:// or postgres:// URL containing "?sslmode=require"',
    })
    .transform((val) => (val && val.trim() !== '' ? val.trim() : undefined)),

  // Optional test database for isolated test suites
  TEST_DATABASE_URL: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || validateNeonUrl(val), {
      message:
        'TEST_DATABASE_URL must be a valid postgresql:// or postgres:// URL containing "?sslmode=require"',
    }),

  // Controls whether migrations execute automatically during startup
  RUN_MIGRATIONS_ON_START: z
    .preprocess((val) => {
      if (val === undefined || val === '') {
        return process.env.NODE_ENV === 'development';
      }
      return val === 'true' || val === true;
    }, z.boolean())
    .default(false),

  // Initial Administrator Credentials for Seeding
  ADMIN_EMAIL: z.string().email().default('admin@myfurniture.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@123456'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(500),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '❌ Invalid environment configuration:',
    JSON.stringify(
      parsed.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
      null,
      2,
    ),
  );
  throw new Error('Environment variable validation failed');
}

export const env = parsed.data;

/**
 * Returns the direct unpooled database connection string for migrations/seeding,
 * falling back to the primary DATABASE_URL if unpooled is not specified.
 */
export const getUnpooledDatabaseUrl = (): string => {
  return env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
};

/**
 * Returns the effective test database connection string if configured, otherwise falls back to runtime URL.
 */
export const getTestDatabaseUrl = (): string => {
  return env.TEST_DATABASE_URL || env.DATABASE_URL;
};
