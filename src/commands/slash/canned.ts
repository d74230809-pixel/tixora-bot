import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  export const data = new SlashCommandBuilder()
    .setName('canned').setDescription('Send a saved canned reply in this ticket')
    .addStringOption(o => o.setName('name').setDescription('Name or shortcut of the reply').setRequired(true));
  export default { data, async execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('name', true);
    const { data: replies } = await supabase.from('canned_replies').select().eq('guild_id', interaction.guildId!)
      .or(`name.ilike.${name},shortcut.ilike.${name}`).limit(1);
    if (!replies?.length) { await interaction.reply({ content: `No canned reply found for "${name}".`, ephemeral: true }); return; }
    await interaction.reply({ content: replies[0].content });
  }};