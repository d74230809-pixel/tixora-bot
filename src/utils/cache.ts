import { Collection } from 'discord.js';

// Simple in-memory cache for guild settings and blacklist
// Key: guild_id, Value: Settings/Blacklist data
export const guildCache = new Collection<string, any>();
export const blacklistCache = new Collection<string, Set<string>>();

// Cache TTL (10 minutes)
const CACHE_TTL = 10 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

export function getCachedGuild(guildId: string) {
  const timestamp = cacheTimestamps.get(`guild:${guildId}`);
  if (timestamp && Date.now() - timestamp < CACHE_TTL) {
    return guildCache.get(guildId);
  }
  return null;
}

export function setCachedGuild(guildId: string, data: any) {
  guildCache.set(guildId, data);
  cacheTimestamps.set(`guild:${guildId}`, Date.now());
}

export function getCachedBlacklist(guildId: string) {
  const timestamp = cacheTimestamps.get(`blacklist:${guildId}`);
  if (timestamp && Date.now() - timestamp < CACHE_TTL) {
    return blacklistCache.get(guildId);
  }
  return null;
}

export function setCachedBlacklist(guildId: string, userIds: string[]) {
  blacklistCache.set(guildId, new Set(userIds));
  cacheTimestamps.set(`blacklist:${guildId}`, Date.now());
}

export function clearCache(guildId: string) {
  guildCache.delete(guildId);
  blacklistCache.delete(guildId);
  cacheTimestamps.delete(`guild:${guildId}`);
  cacheTimestamps.delete(`blacklist:${guildId}`);
}
