import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { isStaff } from '../../utils/permissions.js';
import { db } from '../../database/client.js';
import { errorEmbed, TIXORA_COLOR } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('canned')
    .setDescription('Send a saved canned reply template in this ticket')
    .addStringOption(o => o.setName('name').setDescription('Name or shortcut of the reply').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const member = interaction.guild.members.cache.get(interaction.user.id)
      ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) {
      await interaction.reply({ embeds: [errorEmbed('No Permission', 'Only staff can use canned replies.')], ephemeral: true });
      return;
    }
    const name = interaction.options.getString('name', true);
    const { data: replies } = await db
      .from('canned_replies')
      .select()
      .eq('guild_id', interaction.guildId!)
      .or(`name.ilike.${name},shortcut.ilike.${name}`)
      .limit(1);

    if (!replies?.length) {
      await interaction.reply({ embeds: [errorEmbed('Not Found', `No canned reply found for "${name}". Check the dashboard to add replies.`)], ephemeral: true });
      return;
    }
    await interaction.reply({ content: replies[0].content });
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const name = args.join(' ');
    if (!name) { await message.reply({ embeds: [errorEmbed('Usage', 'T!canned <name>')] }); return; }
    const member = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(member)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')] }); return; }
    const { data: replies } = await db
      .from('canned_replies')
      .select()
      .eq('guild_id', message.guildId!)
      .or(`name.ilike.${name},shortcut.ilike.${name}`)
      .limit(1);
    if (!replies?.length) { await message.reply({ embeds: [errorEmbed('Not Found', `No canned reply found for "${name}".`)] }); return; }
    await message.reply({ content: replies[0].content });
  },
};
