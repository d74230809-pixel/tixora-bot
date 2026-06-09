import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  export const data = new SlashCommandBuilder()
    .setName('sla')
    .setDescription('Check SLA status of this ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

  export async function execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.channelId;
    const guildId = interaction.guildId!;

    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, opened_at, status')
      .eq('channel_id', channelId)
      .single();

    if (!ticket) {
      await interaction.reply({ content: 'This command must be used inside a ticket channel.', ephemeral: true });
      return;
    }

    const { data: config } = await supabase
      .from('sla_config')
      .select()
      .eq('guild_id', guildId)
      .single();

    const responseMinutes = config?.response_sla_minutes ?? 60;
    const resolutionHours = config?.resolution_sla_hours ?? 24;
    const opened = new Date(ticket.opened_at);
    const now = new Date();
    const elapsed = (now.getTime() - opened.getTime()) / 60000; // minutes

    const responseBreached = elapsed > responseMinutes;
    const resolutionBreached = elapsed > resolutionHours * 60;

    const embed = new EmbedBuilder()
      .setTitle('SLA Status')
      .setColor(resolutionBreached ? 0xff4444 : responseBreached ? 0xffaa00 : 0x00cc66)
      .addFields(
        { name: 'Ticket Age', value: `${Math.floor(elapsed / 60)}h ${Math.floor(elapsed % 60)}m`, inline: true },
        { name: 'Response SLA', value: responseBreached ? `Breached (${responseMinutes}m)` : `OK (${responseMinutes}m limit)`, inline: true },
        { name: 'Resolution SLA', value: resolutionBreached ? `Breached (${resolutionHours}h)` : `OK (${resolutionHours}h limit)`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }