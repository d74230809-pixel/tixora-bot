import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Direct IP connection to bypass Railway's IPv6 DNS issues
const pool = new pg.Pool({
  host: '15.237.135.103', // Direct IPv4 of your Supabase DB
  port: 5432,
  user: 'postgres',
  password: 'FYuQoNUZ3pJXZG4p',
  database: 'postgres',
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
  realtime: { transport: ws },
});
export const supabase = db;
