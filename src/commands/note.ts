import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  export const data = new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add an internal staff note to this ticket (invisible to the user)')
    .addStringOption(o => o.setName('content').setDescription('Note content').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

  export async function execute(interaction: ChatInputCommandInteraction) {
    const content = interaction.options.getString('content', true);
    const channelId = interaction.channelId;
    const guildId = interaction.guildId!;

    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('channel_id', channelId)
      .single();

    if (!ticket) {
      await interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
      return;
    }

    await supabase.from('internal_notes').insert({
      ticket_id: ticket.id,
      guild_id: guildId,
      author_id: interaction.user.id,
      content,
    });

    await interaction.reply({
      content: `**[Staff Note]** ${content}`,
      ephemeral: false,
    });
  }