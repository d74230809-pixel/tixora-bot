import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  export const data = new SlashCommandBuilder()
    .setName('note').setDescription('Add a staff-only internal note to this ticket')
    .addStringOption(o => o.setName('content').setDescription('Note content').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
  export default { data, async execute(interaction: ChatInputCommandInteraction) {
    const content = interaction.options.getString('content', true);
    const { data: ticket } = await supabase.from('tickets').select('id').eq('channel_id', interaction.channelId).single();
    if (!ticket) { await interaction.reply({ content: 'Use inside a ticket channel only.', ephemeral: true }); return; }
    await supabase.from('internal_notes').insert({ ticket_id: ticket.id, guild_id: interaction.guildId!, author_id: interaction.user.id, content });
    await interaction.reply({ content: `**[Staff Note]** ${content}` });
  }};