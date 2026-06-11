import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Direct connection to Supabase DB
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:FYuQoNUZ3pJXZG4p@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) console.warn(`[DB] Slow query (${duration}ms): ${text}`);
    return res;
  } finally {
    client.release();
  }
};

// Supabase client only for Realtime/Auth if needed
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const db = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws as any },
});
export const supabase = db;
