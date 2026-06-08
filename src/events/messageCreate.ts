import type { Message, Client } from 'discord.js';
import type { SlashCommand } from '../bot.js';
import { getGuild, updateLastActivity, getTicketByChannel } from '../database/queries.js';
import { errorEmbed } from '../utils/embed.js';

export default async function onMessage(
  message: Message,
  client: Client,
  commands: Map<string, SlashCommand>,
): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;

  // Update last activity for open tickets
  if (message.channel.isTextBased() && 'name' in message.channel && message.channel.name.startsWith('ticket-')) {
    const ticket = await getTicketByChannel(message.channel.id);
    if (ticket && ticket.status === 'open') {
      await updateLastActivity(ticket.id).catch(() => null);
    }
  }

  const guildConfig = await getGuild(message.guild.id);
  const prefix = guildConfig?.prefix ?? 'T!';

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  // Map prefix commands to slash command logic
  const command = commands.get(commandName);
  if (!command || !command.prefixExecute) return;

  try {
    await command.prefixExecute(message, args);
  } catch (err) {
    console.error(`[Prefix] Error in T!${commandName}:`, err);
    await message.reply({ embeds: [errorEmbed('Command failed', 'An unexpected error occurred.')] });
  }
}
