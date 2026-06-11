import { query } from './client.js';
import type { Guild, Category, Form, Ticket, PriorityLevel } from '../types/index.js';

export async function getGuild(guildId: string): Promise<Guild | null> {
  const res = await query('guilds', 'select', { filter: { guild_id: guildId }, single: true });
  return res.rows[0] || null;
}

export async function ensureGuild(guildId: string): Promise<Guild> {
  const existing = await getGuild(guildId);
  if (existing) return existing;
  const res = await query('guilds', 'insert', { data: { guild_id: guildId } });
  return res.rows[0];
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const res = await query('categories', 'select', { filter: { id }, single: true });
  return res.rows[0] || null;
}

export async function getPriorityById(id: string): Promise<PriorityLevel | null> {
  const res = await query('priorities', 'select', { filter: { id }, single: true });
  return res.rows[0] || null;
}

export async function getPrioritiesForGuild(guildId: string): Promise<PriorityLevel[]> {
  const res = await query('priorities', 'select', { filter: { guild_id: guildId } });
  return res.rows;
}

export async function getFormById(id: string): Promise<Form | null> {
  const res = await query('forms', 'select', { filter: { id }, single: true });
  return res.rows[0] || null;
}

export async function createTicket(data: any): Promise<Ticket> {
  const res = await query('tickets', 'insert', { data });
  return res.rows[0];
}

export async function closeTicket(ticketId: string, reason?: string): Promise<void> {
  await query('tickets', 'update', { 
    filter: { id: ticketId }, 
    data: { status: 'closed', closed_at: new Date().toISOString(), close_reason: reason || null } 
  });
}

export async function reopenTicket(ticketId: string): Promise<void> {
  await query('tickets', 'update', { 
    filter: { id: ticketId }, 
    data: { status: 'open', closed_at: null } 
  });
}

export async function claimTicket(ticketId: string, staffId: string): Promise<void> {
  await query('tickets', 'update', { 
    filter: { id: ticketId }, 
    data: { staff_id: staffId, claimed_at: new Date().toISOString() } 
  });
}

export async function unclaimTicket(ticketId: string): Promise<void> {
  await query('tickets', 'update', { 
    filter: { id: ticketId }, 
    data: { staff_id: null, claimed_at: null } 
  });
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const res = await query('tickets', 'select', { filter: { id }, single: true });
  return res.rows[0] || null;
}

export async function getTicketByChannel(channelId: string): Promise<Ticket | null> {
  const res = await query('tickets', 'select', { 
    filter: { channel_id: channelId, status: 'open' }, 
    single: true 
  });
  return res.rows[0] || null;
}

export async function isBlacklisted(guildId: string, userId: string): Promise<boolean> {
  const res = await query('blacklists', 'select', { filter: { guild_id: guildId, user_id: userId } });
  return res.rowCount > 0;
}

export async function addToBlacklist(guildId: string, userId: string, reason?: string): Promise<void> {
  await query('blacklists', 'insert', { data: { guild_id: guildId, user_id: userId, reason: reason || null } });
}

export async function removeFromBlacklist(guildId: string, userId: string): Promise<void> {
  await query('blacklists', 'delete', { filter: { guild_id: guildId, user_id: userId } });
}

export async function logAction(ticketId: string, userId: string, action: string, details?: any): Promise<void> {
  await query('ticket_actions', 'insert', { 
    data: { ticket_id: ticketId, user_id: userId, action_type: action, details_json: details || {} } 
  });
}

export async function saveTranscript(ticketId: string, messages: any[]): Promise<void> {
  await query('transcripts', 'insert', { 
    data: { ticket_id: ticketId, messages_json: messages } 
  });
}

export async function saveAiSummary(ticketId: string, summary: string): Promise<void> {
  await query('tickets', 'update', { 
    filter: { id: ticketId }, 
    data: { ai_summary: summary } 
  });
}

export async function updateLastActivity(channelId: string): Promise<void> {
  await query('tickets', 'update', { 
    filter: { channel_id: channelId, status: 'open' }, 
    data: { last_activity_at: new Date().toISOString() } 
  });
}

export async function getOpenTicketsOlderThan(hours: number): Promise<Ticket[]> {
  // Complex filter for older than X hours might need a specialized internal route if this doesn't work
  // For now, let's fetch and filter in code or use a simpler check
  const res = await query('tickets', 'select', { filter: { status: 'open' } });
  const threshold = Date.now() - hours * 3600000;
  return res.rows.filter((t: any) => new Date(t.last_activity_at).getTime() < threshold);
}

export async function getAutoCloseConfigs(): Promise<any[]> {
  const res = await query('guilds', 'select', { filter: { auto_close_enabled: true } });
  return res.rows;
}

export async function addMemberToTicket(ticketId: string, userId: string): Promise<void> {
  await logAction(ticketId, userId, 'member_added');
}

export async function removeMemberFromTicket(ticketId: string, userId: string): Promise<void> {
  await logAction(ticketId, userId, 'member_removed');
}

export async function updateTicketPriority(ticketId: string, priorityId: string): Promise<void> {
  await query('tickets', 'update', { filter: { id: ticketId }, data: { priority_id: priorityId } });
}

export async function addTagToTicket(ticketId: string, tag: string): Promise<void> {
  await logAction(ticketId, tag, 'tag_added');
}

export async function removeTagFromTicket(ticketId: string, tag: string): Promise<void> {
  await logAction(ticketId, tag, 'tag_removed');
}
