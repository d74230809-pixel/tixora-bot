import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Direct PostgreSQL connection for ultra-low latency
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:FYuQoNUZ3pJXZG4p@db.kbhhuectbfyprebpvimc.supabase.co:5432/postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

// Keep Supabase client only for specific things if needed (like storage/auth)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const db = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

// Legacy compatibility wrapper to avoid breaking all files at once
export const supabase = db;
