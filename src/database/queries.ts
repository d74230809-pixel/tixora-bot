import { query } from './client.js';
import type { Guild, Category, Form, Ticket, PriorityLevel } from '../types/index.js';

export async function getGuild(guildId: string): Promise<Guild | null> {
  const res = await query('SELECT * FROM guilds WHERE guild_id = $1', [guildId]);
  return res.rows[0] || null;
}

export async function ensureGuild(guildId: string): Promise<Guild> {
  const existing = await getGuild(guildId);
  if (existing) return existing;
  const res = await query('INSERT INTO guilds (guild_id) VALUES ($1) RETURNING *', [guildId]);
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

export async function getPrioritiesForGuild(guildId: string): Promise<PriorityLevel[]> {
  const res = await query('SELECT * FROM priorities WHERE guild_id = $1', [guildId]);
  return res.rows;
}

export async function getFormById(id: string): Promise<Form | null> {
  const res = await query('SELECT * FROM forms WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function createTicket(data: any): Promise<Ticket> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const res = await query(`INSERT INTO tickets (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
  return res.rows[0];
}

export async function closeTicket(ticketId: string, reason?: string): Promise<void> {
  await query('UPDATE tickets SET status = $1, closed_at = $2, close_reason = $3 WHERE id = $4', 
    ['closed', new Date().toISOString(), reason || null, ticketId]);
}

export async function reopenTicket(ticketId: string): Promise<void> {
  await query('UPDATE tickets SET status = $1, closed_at = $2 WHERE id = $3', 
    ['open', null, ticketId]);
}

export async function claimTicket(ticketId: string, staffId: string): Promise<void> {
  await query('UPDATE tickets SET staff_id = $1, claimed_at = $2 WHERE id = $3', 
    [staffId, new Date().toISOString(), ticketId]);
}

export async function unclaimTicket(ticketId: string): Promise<void> {
  await query('UPDATE tickets SET staff_id = $1, claimed_at = $2 WHERE id = $3', 
    [null, null, ticketId]);
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
  const res = await query('SELECT * FROM blacklists WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  return res.rowCount! > 0;
}

export async function addToBlacklist(guildId: string, userId: string, reason?: string): Promise<void> {
  await query('INSERT INTO blacklists (guild_id, user_id, reason) VALUES ($1, $2, $3)', [guildId, userId, reason || null]);
}

export async function removeFromBlacklist(guildId: string, userId: string): Promise<void> {
  await query('DELETE FROM blacklists WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
}

export async function logAction(ticketId: string, userId: string, action: string, details?: any): Promise<void> {
  await query('INSERT INTO ticket_actions (ticket_id, user_id, action_type, details_json) VALUES ($1, $2, $3, $4)', 
    [ticketId, userId, action, details || {}]);
}

export async function saveTranscript(ticketId: string, messages: any[]): Promise<void> {
  await query('INSERT INTO transcripts (ticket_id, messages_json) VALUES ($1, $2)', [ticketId, JSON.stringify(messages)]);
}

export async function saveAiSummary(ticketId: string, summary: string): Promise<void> {
  await query('UPDATE tickets SET ai_summary = $1 WHERE id = $2', [summary, ticketId]);
}

export async function updateLastActivity(channelId: string): Promise<void> {
  await query('UPDATE tickets SET last_activity_at = $1 WHERE channel_id = $2 AND status = $3', 
    [new Date().toISOString(), channelId, 'open']);
}

export async function getOpenTicketsOlderThan(hours: number): Promise<Ticket[]> {
  const threshold = new Date(Date.now() - hours * 3600000).toISOString();
  const res = await query('SELECT * FROM tickets WHERE status = $1 AND last_activity_at < $2', ['open', threshold]);
  return res.rows;
}

export async function getAutoCloseConfigs(): Promise<any[]> {
  const res = await query('SELECT * FROM guilds WHERE auto_close_enabled = $1', [true]);
  return res.rows;
}

export async function addMemberToTicket(ticketId: string, userId: string): Promise<void> {
  await logAction(ticketId, userId, 'member_added');
}

export async function removeMemberFromTicket(ticketId: string, userId: string): Promise<void> {
  await logAction(ticketId, userId, 'member_removed');
}

export async function updateTicketPriority(ticketId: string, priorityId: string): Promise<void> {
  await query('UPDATE tickets SET priority_id = $1 WHERE id = $2', [priorityId, ticketId]);
}

export async function addTagToTicket(ticketId: string, tag: string): Promise<void> {
  await logAction(ticketId, tag, 'tag_added');
}

export async function removeTagFromTicket(ticketId: string, tag: string): Promise<void> {
  await logAction(ticketId, tag, 'tag_removed');
}
