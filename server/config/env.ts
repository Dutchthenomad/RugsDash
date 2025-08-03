import { z } from 'zod';

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  
  // Optional with defaults
  PORT: z.string().regex(/^\d+$/).default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Security (required in production)
  JWT_SECRET: z.string().min(32).optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || val !== undefined,
    { message: 'JWT_SECRET is required in production' }
  ),
  JWT_ACCESS_TOKEN_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES: z.string().default('7d'),
  SESSION_SECRET: z.string().min(32).optional().refine(
    (val) => process.env.NODE_ENV !== 'production' || val !== undefined,
    { message: 'SESSION_SECRET is required in production' }
  ),
  
  // External services
  RUGS_BACKEND_URL: z.string().url().default('https://backend.rugs.fun'),
  RUGS_FRONTEND_VERSION: z.string().default('1.0'),
  
  // Feature flags
  ENABLE_PAPER_TRADING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_Q_LEARNING: z.string().transform(val => val === 'true').default('true'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).default('100').transform(Number),
  STRICT_RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).default('5').transform(Number),
  
  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:5000'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

// Type-safe environment variable access
export type Env = z.infer<typeof envSchema>;