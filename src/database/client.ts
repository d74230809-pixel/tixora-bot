import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const WEB_API_URL = process.env.WEB_API_URL || 'https://tixorabot.up.railway.app/api/trpc';
const BOT_API_KEY = process.env.BOT_API_KEY || 'tixora_internal_key_2026';

export const query = async (table: string, action: 'select' | 'insert' | 'update' | 'delete', options: any = {}) => {
  const start = Date.now();
  try {
    const response = await fetch(`${WEB_API_URL}/internal.query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-key': BOT_API_KEY
      },
      body: JSON.stringify({
        table,
        action,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API Bridge Error');
    }

    const result = await response.json();
    const duration = Date.now() - start;
    if (duration > 1000) console.warn(`[API Bridge] Slow request (${duration}ms): ${table}.${action}`);
    return { rows: Array.isArray(result.result.data) ? result.result.data : [result.result.data], rowCount: Array.isArray(result.result.data) ? result.result.data.length : 1 };
  } catch (err: any) {
    console.error('[API Bridge] Error:', err.message);
    throw err;
  }
};

// Still keep Supabase for Realtime if needed, but primary data goes through Bridge
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const db = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});
export const supabase = db;
