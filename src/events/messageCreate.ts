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

  // Check prefix FIRST before any database queries
  const prefix = 'T!'; // Default prefix
  if (!message.content.startsWith(prefix)) return;

  // Update last activity for open tickets (non-critical)
  if (message.channel.isTextBased() && 'name' in message.channel && message.channel.name?.startsWith('ticket-')) {
    getTicketByChannel(message.channel.id)
      .then(ticket => ticket && ticket.status === 'open' ? updateLastActivity(ticket.id) : null)
      .catch(() => null); // Silently fail, don't block command processing
  }

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
    try {
      await message.reply({ embeds: [errorEmbed('Command failed', 'An unexpected error occurred.')] });
    } catch (replyErr) {
      console.error(`[Prefix] Failed to send error reply:`, replyErr);
    }
  }
}
