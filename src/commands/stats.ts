import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View ticket statistics for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

  export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const guildId = interaction.guildId!;

    const [totalRes, openRes, closedRes, ratingRes] = await Promise.all([
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'open'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('status', 'closed'),
      supabase.from('ticket_ratings').select('rating').eq('guild_id', guildId),
    ]);

    const ratings = ratingRes.data ?? [];
    const avgRating = ratings.length
      ? (ratings.reduce((a, r) => a + r.rating, 0) / ratings.length).toFixed(1)
      : 'N/A';

    const embed = new EmbedBuilder()
      .setTitle(`Ticket Stats — ${interaction.guild!.name}`)
      .setColor(0x5865F2)
      .addFields(
        { name: 'Total Tickets', value: String(totalRes.count ?? 0), inline: true },
        { name: 'Open', value: String(openRes.count ?? 0), inline: true },
        { name: 'Closed', value: String(closedRes.count ?? 0), inline: true },
        { name: 'Avg Rating', value: avgRating, inline: true },
        { name: 'Total Ratings', value: String(ratings.length), inline: true },
      )
      .setFooter({ text: 'View full analytics in your Tixora dashboard' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }