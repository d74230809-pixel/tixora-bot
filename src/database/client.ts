import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import dns from 'dns';

// Force IPv4 for database connection to fix ENETUNREACH on Railway
dns.setDefaultResultOrder('ipv4first');

// Optimized pool settings for Railway
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:FYuQoNUZ3pJXZG4p@db.kbhhuectbfyprebpvimc.supabase.co:5432/postgres',
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('[Postgres] Unexpected error on idle client', err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[Postgres] Slow query (${duration}ms): ${text}`);
    }
    return res;
  } catch (err) {
    console.error('[Postgres] Query Error:', err);
    throw err;
  }
};

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const db = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});
export const supabase = db;
