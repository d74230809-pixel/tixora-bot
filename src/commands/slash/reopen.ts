import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, ChannelType, PermissionFlagsBits } from 'discord.js';
import { getTicketByChannel, reopenTicket, logAction } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder().setName('reopen').setDescription('Reopen a closed ticket'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket || ticket.status !== 'closed') { await interaction.reply({ embeds: [errorEmbed('Not Closed', 'This ticket is not closed.')], ephemeral: true }); return; }
    const member = interaction.guild.members.cache.get(interaction.user.id) ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) { await interaction.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')], ephemeral: true }); return; }
    await reopenTicket(ticket.id);
    await logAction(ticket.id, interaction.user.id, 'reopened');
    if (interaction.channel.isTextBased() && 'permissionOverwrites' in interaction.channel) {
      await (interaction.channel as import('discord.js').TextChannel).permissionOverwrites.edit(ticket.opener_id, { ViewChannel: true, SendMessages: true });
    }
    await interaction.reply({ embeds: [successEmbed('Ticket Reopened', `This ticket has been reopened by <@${interaction.user.id}>.`)] });
  },

  async prefixExecute(message: Message): Promise<void> {
    if (!message.guild) return;
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket || ticket.status !== 'closed') { await message.reply({ embeds: [errorEmbed('Not Closed', '')] }); return; }
    const member = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(member)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')] }); return; }
    await reopenTicket(ticket.id);
    await logAction(ticket.id, message.author.id, 'reopened');
    await message.reply({ embeds: [successEmbed('Reopened', 'Ticket reopened.')] });
  },
};
