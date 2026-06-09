import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  export const data = new SlashCommandBuilder()
    .setName('sla').setDescription('Check SLA status for this ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
  export default { data, async execute(interaction: ChatInputCommandInteraction) {
    const { data: ticket } = await supabase.from('tickets').select('id, opened_at').eq('channel_id', interaction.channelId).single();
    if (!ticket) { await interaction.reply({ content: 'Use inside a ticket channel.', ephemeral: true }); return; }
    const { data: config } = await supabase.from('sla_config').select().eq('guild_id', interaction.guildId!).single();
    const respMins = config?.response_sla_minutes ?? 60;
    const resMins = (config?.resolution_sla_hours ?? 24) * 60;
    const elapsed = (Date.now() - new Date(ticket.opened_at).getTime()) / 60000;
    const respBreached = elapsed > respMins;
    const resBreached = elapsed > resMins;
    const embed = new EmbedBuilder().setTitle('SLA Status')
      .setColor(resBreached ? 0xff4444 : respBreached ? 0xffaa00 : 0x00cc66)
      .addFields(
        { name: 'Age', value: `${Math.floor(elapsed/60)}h ${Math.floor(elapsed%60)}m`, inline: true },
        { name: 'Response', value: respBreached ? `Breached (${respMins}m limit)` : `OK`, inline: true },
        { name: 'Resolution', value: resBreached ? `Breached (${resMins/60}h limit)` : `OK`, inline: true },
      ).setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }};