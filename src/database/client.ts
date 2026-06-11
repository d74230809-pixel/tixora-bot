import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import dns from 'dns';

// Force IPv4 globally for the process
dns.setDefaultResultOrder('ipv4first');

// Railway often has issues with IPv6. We use the IPv4 address directly if possible,
// but for now, we'll just ensure the pool is as simple as possible.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:FYuQoNUZ3pJXZG4p@db.kbhhuectbfyprebpvimc.supabase.co:5432/postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Some environments need SSL, others don't. This covers both.
  ssl: process.env.DATABASE_URL?.includes('supabase') || !process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('[Postgres] Unexpected error on idle client:', err.message);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  let client;
  try {
    client = await pool.connect();
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) console.warn(`[Postgres] Slow query (${duration}ms): ${text.slice(0, 100)}`);
    return res;
  } catch (err: any) {
    console.error('[Postgres] Query Error:', err.message);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const db = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});
export const supabase = db;
