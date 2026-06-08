import type { GuildMember } from 'discord.js';
import { db } from '../database/client.js';

export async function isStaff(member: GuildMember): Promise<boolean> {
  if (member.permissions.has('ManageGuild')) return true;
  if (member.permissions.has('Administrator')) return true;

  const { data } = await db
    .from('staff_roles')
    .select('role_id')
    .eq('guild_id', member.guild.id);

  if (!data) return false;
  const staffRoleIds = data.map((r: { role_id: string }) => r.role_id);
  return member.roles.cache.some(r => staffRoleIds.includes(r.id));
}

export async function canManage(member: GuildMember): Promise<boolean> {
  if (member.permissions.has('ManageGuild')) return true;
  if (member.permissions.has('Administrator')) return true;

  const { data } = await db
    .from('staff_roles')
    .select('role_id, permissions_json')
    .eq('guild_id', member.guild.id);

  if (!data) return false;
  for (const row of data) {
    if (member.roles.cache.has(row.role_id)) {
      const perms = row.permissions_json as { manage?: boolean };
      if (perms.manage) return true;
    }
  }
  return false;
}
