// MOCK QUERIES - NO DATABASE
export async function getGuild(guildId: string): Promise<any> { return { guild_id: guildId }; }
export async function ensureGuild(guildId: string): Promise<any> { return { guild_id: guildId }; }
export async function getCategoryById(id: string): Promise<any> { return null; }
export async function getPriorityById(id: string): Promise<any> { return null; }
export async function getPrioritiesForGuild(guildId: string): Promise<any[]> { return []; }
export async function getFormById(id: string): Promise<any> { return null; }
export async function createTicket(data: any): Promise<any> { return { ...data, id: Math.random().toString(36).substr(2, 9) }; }
export async function closeTicket(ticketId: string, reason?: string): Promise<void> { }
export async function reopenTicket(ticketId: string): Promise<void> { }
export async function claimTicket(ticketId: string, staffId: string): Promise<void> { }
export async function unclaimTicket(ticketId: string): Promise<void> { }
export async function getTicketById(id: string): Promise<any> { return null; }
export async function getTicketByChannel(channelId: string): Promise<any> { return { id: 'mock', channel_id: channelId }; }
export async function isBlacklisted(guildId: string, userId: string): Promise<boolean> { return false; }
export async function addToBlacklist(guildId: string, userId: string, reason?: string): Promise<void> { }
export async function removeFromBlacklist(guildId: string, userId: string): Promise<void> { }
export async function logAction(ticketId: string, userId: string, action: string, details?: any): Promise<void> { }
export async function saveTranscript(ticketId: string, messages: any[]): Promise<void> { }
export async function saveAiSummary(ticketId: string, summary: string): Promise<void> { }
export async function updateLastActivity(channelId: string): Promise<void> { }
export async function getOpenTicketsOlderThan(hours: number): Promise<any[]> { return []; }
export async function getAutoCloseConfigs(): Promise<any[]> { return []; }
export async function addMemberToTicket(ticketId: string, userId: string): Promise<void> { }
export async function removeMemberFromTicket(ticketId: string, userId: string): Promise<void> { }
export async function updateTicketPriority(ticketId: string, priorityId: string): Promise<void> { }
export async function addTagToTicket(ticketId: string, tag: string): Promise<void> { }
export async function removeTagFromTicket(ticketId: string, tag: string): Promise<void> { }
