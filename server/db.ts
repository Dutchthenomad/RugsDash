import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Allow placeholder DATABASE_URL in development with in-memory storage
const isDevelopment = process.env.NODE_ENV === 'development';
const isPlaceholderUrl = process.env.DATABASE_URL?.includes('localhost');

if (!process.env.DATABASE_URL && !isDevelopment) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Only create pool/db if we have a real database URL
export const pool = (!isPlaceholderUrl && process.env.DATABASE_URL) 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null as any;

export const db = pool 
  ? drizzle({ client: pool, schema })
  : null as any;
