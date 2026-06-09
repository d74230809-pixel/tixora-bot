import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  export const data = new SlashCommandBuilder()
    .setName('canned')
    .setDescription('Send a canned reply in this ticket')
    .addStringOption(o => o.setName('name').setDescription('Name or shortcut of the canned reply').setRequired(true));

  export async function execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('name', true);
    const guildId = interaction.guildId!;

    const { data: replies } = await supabase
      .from('canned_replies')
      .select()
      .eq('guild_id', guildId)
      .or(`name.ilike.${name},shortcut.ilike.${name}`)
      .limit(1);

    if (!replies || replies.length === 0) {
      await interaction.reply({ content: `No canned reply found for "${name}". Check your dashboard.`, ephemeral: true });
      return;
    }

    await interaction.reply({ content: replies[0].content });
  }