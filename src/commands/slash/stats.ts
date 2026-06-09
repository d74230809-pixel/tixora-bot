import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { db } from '../../database/client.js';
import { TIXORA_COLOR } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View ticket statistics for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();
    const guildId = interaction.guildId!;

    const [total, open, closed, claimedRes, ratingsRes, todayRes] = await Promise.all([
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId),
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'open'),
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'closed'),
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'open').not('claimed_by', 'is', null),
      db.from('ticket_ratings').select('rating').eq('guild_id', guildId),
      db.from('tickets').select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .gte('opened_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    const rs = ratingsRes.data ?? [];
    const avg = rs.length ? (rs.reduce((a, r) => a + r.rating, 0) / rs.length).toFixed(1) : 'N/A';
    const claimed = claimedRes.count ?? 0;
    const openCount = open.count ?? 0;
    const unclaimedOpen = openCount - claimed;

    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setTitle(`Ticket Stats — ${interaction.guild!.name}`)
      .addFields(
        { name: 'Total Tickets', value: String(total.count ?? 0), inline: true },
        { name: 'Open', value: String(openCount), inline: true },
        { name: 'Closed', value: String(closed.count ?? 0), inline: true },
        { name: 'Opened Today', value: String(todayRes.count ?? 0), inline: true },
        { name: 'Claimed', value: String(claimed), inline: true },
        { name: 'Unclaimed', value: String(unclaimedOpen), inline: true },
        { name: 'Avg Rating', value: avg, inline: true },
        { name: 'Total Ratings', value: String(rs.length), inline: true },
        { name: 'Bot Ping', value: `${interaction.client.ws.ping}ms`, inline: true },
      )
      .setFooter({ text: 'Full analytics at your Tixora dashboard' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async prefixExecute(message: Message): Promise<void> {
    const guildId = message.guildId!;
    const [total, open, closed, ratingsRes] = await Promise.all([
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId),
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'open'),
      db.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'closed'),
      db.from('ticket_ratings').select('rating').eq('guild_id', guildId),
    ]);
    const rs = ratingsRes.data ?? [];
    const avg = rs.length ? (rs.reduce((a, r) => a + r.rating, 0) / rs.length).toFixed(1) : 'N/A';

    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setTitle(`Ticket Stats — ${message.guild!.name}`)
      .addFields(
        { name: 'Total', value: String(total.count ?? 0), inline: true },
        { name: 'Open', value: String(open.count ?? 0), inline: true },
        { name: 'Closed', value: String(closed.count ?? 0), inline: true },
        { name: 'Avg Rating', value: avg, inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
