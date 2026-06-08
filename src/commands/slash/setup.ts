import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { ensureGuild, getPanelsForGuild } from '../../database/queries.js';
import { canManage } from '../../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embed.js';

const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL ?? 'https://tixora.app';

export default {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup Tixora for this server — opens the dashboard link'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const member = interaction.guild.members.cache.get(interaction.user.id) ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await canManage(member)) { await interaction.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Guild to run setup.')], ephemeral: true }); return; }
    await ensureGuild(interaction.guild.id);
    const dashUrl = `${DASHBOARD_BASE_URL}/dashboard/${interaction.guild.id}`;
    await interaction.reply({
      embeds: [infoEmbed('Setup Tixora', `Configure panels, staff roles, auto-close, and more from the dashboard:\n\n**[Open Dashboard](${dashUrl})**\n\nAll changes take effect immediately.`)],
      ephemeral: true,
    });
  },

  async prefixExecute(message: Message): Promise<void> {
    if (!message.guild) return;
    const member = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await canManage(member)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Manage Guild required.')] }); return; }
    await ensureGuild(message.guild.id);
    const dashUrl = `${DASHBOARD_BASE_URL}/dashboard/${message.guild.id}`;
    await message.reply({ embeds: [infoEmbed('Setup Tixora', `Configure Tixora at: ${dashUrl}`)] });
  },
};
