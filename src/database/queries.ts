import { db } from './client.js';
import type {
  Guild, Panel, Category, Form, Ticket,
  TicketActionType, TranscriptMessage, PriorityLevel
} from '../types/index.js';

// ── Guilds ───────────────────────────────────────────────────────────────────

export async function ensureGuild(guildId: string): Promise<Guild> {
  const { data, error } = await db
    .from('guilds')
    .upsert({ guild_id: guildId }, { onConflict: 'guild_id', ignoreDuplicates: true })
    .select()
    .single();
  if (error) {
    const existing = await db.from('guilds').select().eq('guild_id', guildId).single();
    if (existing.error) throw existing.error;
    return existing.data as Guild;
  }
  return data as Guild;
}

export async function getGuild(guildId: string): Promise<Guild | null> {
  const { data } = await db.from('guilds').select().eq('guild_id', guildId).single();
  return data as Guild | null;
}

export async function updateGuild(guildId: string, updates: Partial<Guild>): Promise<void> {
  await db.from('guilds').update(updates).eq('guild_id', guildId);
}

// ── Panels ───────────────────────────────────────────────────────────────────

export async function getPanelsForGuild(guildId: string): Promise<Panel[]> {
  const { data } = await db.from('panels').select().eq('guild_id', guildId);
  return (data as Panel[]) ?? [];
}

export async function updatePanelMessage(panelId: string, channelId: string, messageId: string): Promise<void> {
  await db.from('panels').update({ channel_id: channelId, message_id: messageId, updated_at: new Date().toISOString() }).eq('id', panelId);
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategoriesForGuild(guildId: string): Promise<Category[]> {
  const { data } = await db.from('categories').select().eq('guild_id', guildId);
  return (data as Category[]) ?? [];
}

export async function getCategoryById(categoryId: string): Promise<Category | null> {
  const { data } = await db.from('categories').select().eq('id', categoryId).single();
  return data as Category | null;
}

// ── Forms ────────────────────────────────────────────────────────────────────

export async function getFormById(formId: string): Promise<Form | null> {
  const { data } = await db.from('forms').select().eq('id', formId).single();
  return data as Form | null;
}

// ── Priority Levels ──────────────────────────────────────────────────────────

export async function getPriorityById(priorityId: string): Promise<PriorityLevel | null> {
  const { data } = await db.from('priority_levels').select().eq('id', priorityId).single();
  return data as PriorityLevel | null;
}

export async function getPrioritiesForGuild(guildId: string): Promise<PriorityLevel[]> {
  const { data } = await db.from('priority_levels').select().eq('guild_id', guildId).order('sort_order');
  return (data as PriorityLevel[]) ?? [];
}

// ── Blacklist ─────────────────────────────────────────────────────────────────

export async function isBlacklisted(guildId: string, userId: string): Promise<boolean> {
  const { data } = await db.from('blacklist').select('id').eq('guild_id', guildId).eq('user_id', userId).single();
  return data !== null;
}

export async function addToBlacklist(guildId: string, userId: string, createdBy: string, reason?: string): Promise<void> {
  await db.from('blacklist').upsert({ guild_id: guildId, user_id: userId, created_by: createdBy, reason: reason ?? null }, { onConflict: 'guild_id,user_id' });
}

export async function removeFromBlacklist(guildId: string, userId: string): Promise<void> {
  await db.from('blacklist').delete().eq('guild_id', guildId).eq('user_id', userId);
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export async function createTicket(data: {
  guild_id: string;
  channel_id: string;
  opener_id: string;
  category_id?: string | null;
  priority_id?: string | null;
  form_answers_json?: Record<string, string> | null;
}): Promise<Ticket> {
  const { data: ticket, error } = await db.from('tickets').insert({
    guild_id: data.guild_id,
    channel_id: data.channel_id,
    opener_id: data.opener_id,
    category_id: data.category_id ?? null,
    priority_id: data.priority_id ?? null,
    form_answers_json: data.form_answers_json ?? null,
    status: 'open',
    last_activity_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return ticket as Ticket;
}

export async function getTicketByChannel(channelId: string): Promise<Ticket | null> {
  const { data } = await db.from('tickets').select().eq('channel_id', channelId).eq('status', 'open').single();
  return data as Ticket | null;
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const { data } = await db.from('tickets').select().eq('id', ticketId).single();
  return data as Ticket | null;
}

export async function closeTicket(ticketId: string, reason?: string): Promise<void> {
  await db.from('tickets').update({
    status: 'closed',
    closed_at: new Date().toISOString(),
    close_reason: reason ?? null,
  }).eq('id', ticketId);
}

export async function reopenTicket(ticketId: string): Promise<void> {
  await db.from('tickets').update({
    status: 'open',
    closed_at: null,
    close_reason: null,
  }).eq('id', ticketId);
}

export async function claimTicket(ticketId: string, userId: string): Promise<void> {
  await db.from('tickets').update({ claimed_by: userId }).eq('id', ticketId);
}

export async function unclaimTicket(ticketId: string): Promise<void> {
  await db.from('tickets').update({ claimed_by: null }).eq('id', ticketId);
}

export async function updateTicketPriority(ticketId: string, priorityId: string | null): Promise<void> {
  await db.from('tickets').update({ priority_id: priorityId }).eq('id', ticketId);
}

export async function addTagToTicket(ticketId: string, tag: string): Promise<void> {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return;
  const tags = ticket.tags_json ?? [];
  if (!tags.includes(tag)) {
    await db.from('tickets').update({ tags_json: [...tags, tag] }).eq('id', ticketId);
  }
}

export async function removeTagFromTicket(ticketId: string, tag: string): Promise<void> {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return;
  const tags = (ticket.tags_json ?? []).filter((t: string) => t !== tag);
  await db.from('tickets').update({ tags_json: tags }).eq('id', ticketId);
}

export async function updateLastActivity(ticketId: string): Promise<void> {
  await db.from('tickets').update({ last_activity_at: new Date().toISOString() }).eq('id', ticketId);
}

export async function getOpenTicketsOlderThan(guildId: string, hours: number): Promise<Ticket[]> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data } = await db.from('tickets')
    .select()
    .eq('guild_id', guildId)
    .eq('status', 'open')
    .lt('last_activity_at', cutoff);
  return (data as Ticket[]) ?? [];
}

// ── Ticket Actions ────────────────────────────────────────────────────────────

export async function logAction(ticketId: string, actorId: string, actionType: TicketActionType, metadata: Record<string, unknown> = {}): Promise<void> {
  await db.from('ticket_actions').insert({
    ticket_id: ticketId,
    actor_id: actorId,
    action_type: actionType,
    metadata_json: metadata,
  });
}

// ── Ticket Members ────────────────────────────────────────────────────────────

export async function addMemberToTicket(ticketId: string, userId: string, addedBy: string): Promise<void> {
  await db.from('ticket_members').upsert({ ticket_id: ticketId, user_id: userId, added_by: addedBy }, { onConflict: 'ticket_id,user_id', ignoreDuplicates: true });
}

export async function removeMemberFromTicket(ticketId: string, userId: string): Promise<void> {
  await db.from('ticket_members').delete().eq('ticket_id', ticketId).eq('user_id', userId);
}

// ── Transcripts ───────────────────────────────────────────────────────────────

export async function saveTranscript(ticketId: string, messages: TranscriptMessage[]): Promise<void> {
  await db.from('transcripts').upsert({ ticket_id: ticketId, messages_json: messages }, { onConflict: 'ticket_id' });
}

export async function saveAiSummary(ticketId: string, summaryText: string): Promise<void> {
  await db.from('ai_summaries').upsert({ ticket_id: ticketId, summary_text: summaryText, model_used: 'meta/llama-3.1-8b-instruct' }, { onConflict: 'ticket_id' });
}

// ── Ratings ───────────────────────────────────────────────────────────────────

export async function saveRating(ticketId: string, guildId: string, ratedBy: string, rating: number, feedbackText?: string): Promise<void> {
  await db.from('ticket_ratings').upsert({
    ticket_id: ticketId,
    guild_id: guildId,
    rated_by: ratedBy,
    rating,
    feedback_text: feedbackText ?? null,
    rated_at: new Date().toISOString(),
  }, { onConflict: 'ticket_id' });
}

// ── Auto-close configs ────────────────────────────────────────────────────────

export async function getAutoCloseConfigs(guildId: string): Promise<{ timeout_hours: number; category_id: string | null; enabled: boolean }[]> {
  const { data } = await db.from('auto_close_config').select().eq('guild_id', guildId).eq('enabled', true);
  return data ?? [];
}
