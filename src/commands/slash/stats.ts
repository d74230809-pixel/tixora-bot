import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  export const data = new SlashCommandBuilder()
    .setName('stats').setDescription('View ticket statistics for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
  export default { data, async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const guildId = interaction.guildId!;
    const [total, open, closed, ratings] = await Promise.all([
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'open'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'closed'),
      supabase.from('ticket_ratings').select('rating').eq('guild_id', guildId),
    ]);
    const rs = ratings.data ?? [];
    const avg = rs.length ? (rs.reduce((a,r)=>a+r.rating,0)/rs.length).toFixed(1) : 'N/A';
    const embed = new EmbedBuilder().setTitle(`Ticket Stats — ${interaction.guild!.name}`).setColor(0x5865F2)
      .addFields(
        { name: 'Total', value: String(total.count??0), inline: true },
        { name: 'Open', value: String(open.count??0), inline: true },
        { name: 'Closed', value: String(closed.count??0), inline: true },
        { name: 'Avg Rating', value: avg, inline: true },
        { name: 'Ratings', value: String(rs.length), inline: true },
      ).setFooter({ text: 'Full analytics at your Tixora dashboard' }).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }};