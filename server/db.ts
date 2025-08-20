import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL must be set. Did you forget to provision a database?");
  // Don't throw - let the server start without database
  console.log("📝 Server will start without database functionality");
}

export const pool = process.env.DATABASE_URL 
  ? new Pool({ 
      connectionString: process.env.DATABASE_URL,
      // Add connection timeout and retry settings
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 20,
    })
  : null;

export const db = pool ? drizzle({ client: pool, schema }) : null;

// Add error handling for database connection
if (pool) {
  pool.on('error', (err) => {
    console.error('❌ Database pool error:', err);
    // Don't crash the server on database errors
  });
  
  pool.on('connect', () => {
    console.log('✅ Database connection established');
  });
}