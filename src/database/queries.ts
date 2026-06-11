import { query } from './client.js';
import type { Guild, Panel, Category, Form, Ticket, PriorityLevel } from '../types/index.js';

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
  const res = await query('SELECT * FROM priority_levels WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getPrioritiesForGuild(guildId: string): Promise<PriorityLevel[]> {
  const res = await query('SELECT * FROM priority_levels WHERE guild_id = $1 ORDER BY "order" ASC', [guildId]);
  return res.rows;
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
    `INSERT INTO tickets (${columns}) VALUES (${placeholders}) RETURNING *`,
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

export async function reopenTicket(ticketId: string): Promise<void> {
  await query('UPDATE tickets SET status = $1, closed_at = NULL WHERE id = $2', ['open', ticketId]);
}

export async function claimTicket(ticketId: string, staffId: string): Promise<void> {
  await query('UPDATE tickets SET claimed_by = $1, claimed_at = NOW() WHERE id = $2', [staffId, ticketId]);
}

export async function unclaimTicket(ticketId: string): Promise<void> {
  await query('UPDATE tickets SET claimed_by = NULL, claimed_at = NULL WHERE id = $1', [ticketId]);
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const res = await query('SELECT * FROM tickets WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getTicketByChannel(channelId: string): Promise<Ticket | null> {
  const res = await query('SELECT * FROM tickets WHERE channel_id = $1', [channelId]);
  return res.rows[0] || null;
}

export async function isBlacklisted(guildId: string, userId: string): Promise<boolean> {
  const res = await query('SELECT 1 FROM blacklists WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  return res.rowCount ? res.rowCount > 0 : false;
}

export async function addToBlacklist(guildId: string, userId: string, actorId: string, reason?: string): Promise<void> {
  await query(
    'INSERT INTO blacklists (guild_id, user_id, actor_id, reason) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, user_id) DO UPDATE SET reason = EXCLUDED.reason, actor_id = EXCLUDED.actor_id',
    [guildId, userId, actorId, reason || null]
  );
}

export async function removeFromBlacklist(guildId: string, userId: string): Promise<void> {
  await query('DELETE FROM blacklists WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
}

export async function logAction(ticketId: string, userId: string, action: string, details?: any): Promise<void> {
  await query(
    'INSERT INTO ticket_actions (ticket_id, actor_id, action_type, metadata_json) VALUES ($1, $2, $3, $4)',
    [ticketId, userId, action, details ? JSON.stringify(details) : null]
  );
}

export async function saveTranscript(ticketId: string, messages: any[]): Promise<void> {
  await query(
    'INSERT INTO transcripts (ticket_id, messages_json) VALUES ($1, $2) ON CONFLICT (ticket_id) DO UPDATE SET messages_json = EXCLUDED.messages_json',
    [ticketId, JSON.stringify(messages)]
  );
}

export async function saveAiSummary(ticketId: string, summary: string): Promise<void> {
  await query('UPDATE tickets SET ai_summary = $1 WHERE id = $2', [summary, ticketId]);
}

export async function updateLastActivity(ticketId: string): Promise<void> {
  await query('UPDATE tickets SET last_activity_at = NOW() WHERE id = $1', [ticketId]);
}

export async function getOpenTicketsOlderThan(guildId: string, hours: number): Promise<any[]> {
  const res = await query(
    "SELECT * FROM tickets WHERE guild_id = $1 AND status = 'open' AND last_activity_at < NOW() - INTERVAL '1 hour' * $2",
    [guildId, hours]
  );
  return res.rows;
}

export async function getAutoCloseConfigs(guildId?: string): Promise<any[]> {
  const sql = guildId 
    ? 'SELECT guild_id, auto_close_hours as timeout_hours, NULL as category_id FROM guilds WHERE auto_close_enabled = TRUE AND guild_id = $1'
    : 'SELECT guild_id, auto_close_hours as timeout_hours, NULL as category_id FROM guilds WHERE auto_close_enabled = TRUE';
  const params = guildId ? [guildId] : [];
  const res = await query(sql, params);
  return res.rows;
}

export async function addMemberToTicket(ticketId: string, userId: string, actorId?: string): Promise<void> {
  await query('INSERT INTO ticket_members (ticket_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [ticketId, userId]);
  await logAction(ticketId, actorId || userId, 'member_added');
}

export async function removeMemberFromTicket(ticketId: string, userId: string): Promise<void> {
  await query('DELETE FROM ticket_members WHERE ticket_id = $1 AND user_id = $2', [ticketId, userId]);
  await logAction(ticketId, userId, 'member_removed');
}

export async function updateTicketPriority(ticketId: string, priorityId: string | null): Promise<void> {
  await query('UPDATE tickets SET priority_id = $1 WHERE id = $2', [priorityId, ticketId]);
}

export async function addTagToTicket(ticketId: string, tag: string): Promise<void> {
  // Assuming tags are handled via logAction or a specific column
  await logAction(ticketId, tag, 'tag_added');
}

export async function removeTagFromTicket(ticketId: string, tag: string): Promise<void> {
  await logAction(ticketId, tag, 'tag_removed');
}
