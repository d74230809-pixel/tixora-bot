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
      .setTitle('Tixora Dashboard')
      .setDescription(
        `Configure Tixora for **${interaction.guild?.name}** from the web dashboard.\n\n` +
        `**[Open Dashboard →](${DASHBOARD_URL}/dashboard/${interaction.guildId})**\n\n` +
        '**What you can do from the dashboard:**\n' +
        '• Create ticket panels and customise button labels/colors\n' +
        '• Add ticket categories (routes tickets to different channels)\n' +
        '• Set up ticket forms (ask questions before opening)\n' +
        '• Configure staff roles, priority levels, and blacklist\n' +
        '• Set log channel and transcript channel\n' +
        '• View analytics, transcripts, and ratings\n' +
        '• Manage canned replies and knowledge base\n' +
        '• Browse and import panel templates from the community',
      )
      .addFields(
        { name: 'Dashboard URL', value: `${DASHBOARD_URL}/dashboard/${interaction.guildId}`, inline: false },
        { name: 'Quick guide', value: `1. Sign in with Discord\n2. Select **${interaction.guild?.name ?? 'your server'}**\n3. Go to **Panels** and create your first ticket panel\n4. Use \`/help\` to see all available commands`, inline: false },
      )
      .setFooter({ text: 'Tixora — Professional Discord Ticket Bot' })
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
