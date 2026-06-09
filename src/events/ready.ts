import { type Client, REST, Routes, EmbedBuilder, ActivityType } from 'discord.js';
import { startAutoCloseJob } from '../jobs/autoClose.js';
import { getCommands } from '../bot.js';
import { db } from '../database/client.js';

const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL ?? 'https://tixora.app';

async function postStatusUpdate(client: Client): Promise<void> {
  const statsChannelId = process.env.STATS_CHANNEL_ID;
  if (!statsChannelId) return;

  try {
    const channel = client.channels.cache.get(statsChannelId) ?? await client.channels.fetch(statsChannelId).catch(() => null);
    if (!channel || !('send' in channel)) return;

    const [totalRes, openRes] = await Promise.all([
      db.from('tickets').select('id', { count: 'exact', head: true }),
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    const total = totalRes.count ?? 0;
    const open = openRes.count ?? 0;
    const ws = client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Tixora — Status Update')
      .addFields(
        { name: 'Bot Status', value: '🟢 Online', inline: true },
        { name: 'Websocket Ping', value: `${ws}ms`, inline: true },
        { name: 'Servers', value: String(client.guilds.cache.size), inline: true },
        { name: 'Open Tickets', value: String(open), inline: true },
        { name: 'Total Tickets', value: String(total), inline: true },
        { name: 'Uptime', value: formatUptime(client.uptime ?? 0), inline: true },
      )
      .setFooter({ text: `Tixora Bot  •  Updated every 5 minutes` })
      .setTimestamp();

    await (channel as import('discord.js').TextChannel).send({ embeds: [embed] });
  } catch (err) {
    console.error('[Tixora] Failed to post status update:', err);
  }
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export async function postCrashAlert(error: Error): Promise<void> {
  const statsChannelId = process.env.STATS_CHANNEL_ID;
  if (!statsChannelId) return;
  // We can't use the client here so we call Discord API directly
  const token = process.env.DISCORD_TOKEN;
  if (!token) return;
  const embed = {
    title: 'Tixora — Crash Detected',
    description: `**Error:** ${error.message}\n\`\`\`${(error.stack ?? '').slice(0, 800)}\`\`\``,
    color: 0xff4444,
    timestamp: new Date().toISOString(),
    footer: { text: 'Auto-generated crash report' },
  };
  await fetch(`https://discord.com/api/v10/channels/${statsChannelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch(() => {});
}

export default async function onReady(client: Client): Promise<void> {
  console.log(`[Tixora] Logged in as ${client.user?.tag}`);
  client.user?.setPresence({
    activities: [{ name: 'Support tickets | /help', type: ActivityType.Watching }],
    status: 'online',
  });

  try {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (token && clientId) {
      const rest = new REST({ version: '10' }).setToken(token);
      const body = [...getCommands().values()].map(c => c.data.toJSON());
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log(`[Tixora] Registered ${body.length} slash commands globally`);
    }
  } catch (err) {
    console.error('[Tixora] Failed to register slash commands:', err);
  }

  startAutoCloseJob(client);

  // Post initial status and then every 5 minutes
  setTimeout(() => postStatusUpdate(client), 10_000);
  setInterval(() => postStatusUpdate(client), 5 * 60 * 1000);
}
