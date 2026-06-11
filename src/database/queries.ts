import { query } from './client.js';
import type { Guild, Panel, Category, Form, Ticket, PriorityLevel } from '../types/index.js';

// Helper to convert snake_case DB rows to camelCase if needed, 
// but we'll stick to what the bot expects (mostly snake_case from Supabase types)

export async function getGuild(guildId: string): Promise<Guild | null> {
  const res = await query('SELECT * FROM guilds WHERE guild_id = $1', [guildId]);
  return res.rows[0] || null;
}

export async function ensureGuild(guildId: string): Promise<Guild> {
  const existing = await getGuild(guildId);
  if (existing) return existing;
  
  const res = await query(
    'INSERT INTO guilds (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO UPDATE SET guild_id = EXCLUDED.guild_id RETURNING *',
    [guildId]
  );
  return res.rows[0];
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const res = await query('SELECT * FROM categories WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getPriorityById(id: string): Promise<PriorityLevel | null> {
  const res = await query('SELECT * FROM priorities WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getFormById(id: string): Promise<Form | null> {
  const res = await query('SELECT * FROM forms WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function createTicket(data: any): Promise<Ticket> {
  const columns = Object.keys(data).join(', ');
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  
  const res = await query(
    \`INSERT INTO tickets (\${columns}) VALUES (\${placeholders}) RETURNING *\`,
    values
  );
  return res.rows[0];
}

export async function closeTicket(ticketId: string, reason?: string): Promise<void> {
  await query(
    'UPDATE tickets SET status = $1, closed_at = NOW(), close_reason = $2 WHERE id = $3',
    ['closed', reason || null, ticketId]
  );
}

export async function claimTicket(ticketId: string, staffId: string): Promise<void> {
  await query(
    'UPDATE tickets SET staff_id = $1, claimed_at = NOW() WHERE id = $2',
    [staffId, ticketId]
  );
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const res = await query('SELECT * FROM tickets WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getTicketByChannel(channelId: string): Promise<Ticket | null> {
  const res = await query('SELECT * FROM tickets WHERE channel_id = $1 AND status = $2', [channelId, 'open']);
  return res.rows[0] || null;
}

export async function isBlacklisted(guildId: string, userId: string): Promise<boolean> {
  const res = await query(
    'SELECT 1 FROM blacklists WHERE guild_id = $1 AND user_id = $2',
    [guildId, userId]
  );
  return res.rowCount ? res.rowCount > 0 : false;
}

export async function logAction(ticketId: string, userId: string, action: string, details?: any): Promise<void> {
  await query(
    'INSERT INTO ticket_actions (ticket_id, user_id, action_type, details_json) VALUES ($1, $2, $3, $4)',
    [ticketId, userId, action, details || {}]
  );
}

export async function saveTranscript(ticketId: string, messages: any[]): Promise<void> {
  // Store as JSON in transcripts table if it exists, or just log it
  await query(
    'INSERT INTO transcripts (ticket_id, messages_json) VALUES ($1, $2) ON CONFLICT (ticket_id) DO UPDATE SET messages_json = EXCLUDED.messages_json',
    [ticketId, JSON.stringify(messages)]
  );
}

export async function saveAiSummary(ticketId: string, summary: string): Promise<void> {
  await query(
    'UPDATE tickets SET ai_summary = $1 WHERE id = $2',
    [summary, ticketId]
  );
}
