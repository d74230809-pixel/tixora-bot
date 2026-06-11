import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { TIXORA_COLOR } from '../../utils/embed.js';

const DASHBOARD_URL = process.env.DASHBOARD_BASE_URL ?? 'https://tixorabot.up.railway.app';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Get the link to your Tixora dashboard to configure this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setAuthor({ name: 'Tixora Management', iconURL: 'https://tixora.up.railway.app/favicon.ico' })
      .setTitle('🚀 Take control of your support')
      .setDescription(
        `Configure **${interaction.guild?.name}** with our high-performance dashboard.\n\n` +
        `**[Open Web Dashboard](${DASHBOARD_URL}/dashboard/${interaction.guildId})**\n\n` +
        '**Powerful Features:**\n' +
        '✨ **Professional Panels:** Custom embeds, colors, and emojis.\n' +
        '📋 **Dynamic Forms:** Ask the right questions before a ticket opens.\n' +
        '📊 **Live Analytics:** Track staff performance and ticket volume.\n' +
        '🤖 **AI Summaries:** Instant summaries of every closed ticket.\n' +
        '🔒 **Secure Logs:** Full transcripts with searchable history.',
      )
      .addFields(
        { name: '🔗 Quick Access', value: `[Dashboard](${DASHBOARD_URL}/dashboard/${interaction.guildId}) • [Documentation](${DASHBOARD_URL}/docs) • [Support Server](${DASHBOARD_URL}/support)`, inline: false },
      )
      .setFooter({ text: 'Tixora Support • tixora.app', iconURL: 'https://tixora.up.railway.app/favicon.ico' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async prefixExecute(message: Message): Promise<void> {
    if (!message.guild) return;
    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setTitle('Tixora Dashboard')
      .setDescription(`Configure this server: ${DASHBOARD_URL}/dashboard/${message.guildId}\n\nSign in with Discord, select your server, and create your first panel.`)
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  },
};
