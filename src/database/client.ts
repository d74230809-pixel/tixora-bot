import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// We're using the direct IPv4 address to bypass DNS and IPv6 issues entirely
// Resolved db.kbhhuectbfyprebpvimc.supabase.co to its IPv4
const DIRECT_IPV4 = '15.237.135.103'; 

const pool = new pg.Pool({
  // Use the direct IP instead of the hostname
  host: DIRECT_IPV4,
  port: 5432,
  user: 'postgres',
  password: 'FYuQoNUZ3pJXZG4p',
  database: 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
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
