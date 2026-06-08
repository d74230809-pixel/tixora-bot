import type { Client, TextChannel } from 'discord.js';
import { db } from '../database/client.js';
import { getOpenTicketsOlderThan, closeTicket, logAction, getAutoCloseConfigs } from '../database/queries.js';
import { buildAndSendTranscript } from '../services/ticket.js';
import { warningEmbed } from '../utils/embed.js';

export function startAutoCloseJob(client: Client): void {
  // Run every 5 minutes
  setInterval(async () => {
    await runAutoClose(client);
  }, 5 * 60 * 1000);

  console.log('[AutoClose] Job started — running every 5 minutes');
}

async function runAutoClose(client: Client): Promise<void> {
  try {
    // Get all guilds the bot is in
    for (const [guildId] of client.guilds.cache) {
      const configs = await getAutoCloseConfigs(guildId);
      if (!configs.length) continue;

      // Default: use smallest timeout_hours from enabled configs
      const minTimeout = Math.min(...configs.map(c => c.timeout_hours));
      const tickets = await getOpenTicketsOlderThan(guildId, minTimeout);

      for (const ticket of tickets) {
        // Find relevant config for this ticket's category
        const config = configs.find(c =>
          c.category_id === ticket.category_id || c.category_id === null
        );
        if (!config) continue;

        const threshold = new Date(Date.now() - config.timeout_hours * 60 * 60 * 1000);
        const lastActivity = new Date(ticket.last_activity_at);
        if (lastActivity > threshold) continue;

        // Auto-close
        const channel = client.channels.cache.get(ticket.channel_id ?? '') as TextChannel | undefined;
        if (channel) {
          const embed = warningEmbed(
            'Auto-closed',
            `This ticket has been automatically closed due to ${config.timeout_hours} hours of inactivity.`
          );
          await channel.send({ embeds: [embed] });
          await buildAndSendTranscript(ticket, channel);
          // Archive/lock the channel
          await channel.permissionOverwrites.set([
            { id: channel.guild.roles.everyone.id, deny: ['ViewChannel'] },
          ]);
        }

        await closeTicket(ticket.id, `Auto-closed after ${config.timeout_hours}h inactivity`);
        await logAction(ticket.id, client.user!.id, 'auto_closed', { timeout_hours: config.timeout_hours });
        console.log(`[AutoClose] Closed ticket ${ticket.id} in guild ${guildId}`);
      }
    }
  } catch (err) {
    console.error('[AutoClose] Error:', err);
  }
}
