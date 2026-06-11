import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const WEB_API_URL = process.env.WEB_API_URL || 'https://tixorabot.up.railway.app/api/trpc';
const BOT_API_KEY = process.env.BOT_API_KEY || 'tixora_internal_key_2026';

export const query = async (table: string, action: 'select' | 'insert' | 'update' | 'delete', options: any = {}) => {
  const start = Date.now();
  try {
    // tRPC expects the input as a URL-encoded JSON string in a query parameter for mutations/queries sometimes,
    // but for mutations via POST, it expects a specific JSON structure.
    const response = await fetch(`${WEB_API_URL}/internal.query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-key': BOT_API_KEY
      },
      body: JSON.stringify({
        // tRPC POST format: { "0": { "json": { ...input } } }
        "0": {
          "json": {
            table,
            action,
            ...options
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API Bridge] HTTP Error:', response.status, errorText);
      throw new Error(`API Bridge HTTP ${response.status}`);
    }

    const result = await response.json();
    
    // tRPC result format: [{ "result": { "data": { "json": ... } } }]
    const data = result[0]?.result?.data?.json;
    
    if (!data && action !== 'delete') {
      console.error('[API Bridge] Invalid response format:', JSON.stringify(result));
      throw new Error('Invalid API Bridge response');
    }

    const duration = Date.now() - start;
    if (duration > 1000) console.warn(`[API Bridge] Slow request (${duration}ms): ${table}.${action}`);
    
    return { 
      rows: Array.isArray(data) ? data : [data], 
      rowCount: Array.isArray(data) ? data.length : (data ? 1 : 0) 
    };
  } catch (err: any) {
    console.error('[API Bridge] Error:', err.message);
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
