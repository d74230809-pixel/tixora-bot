import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { getTicketByChannel, unclaimTicket, logAction } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder().setName('unclaim').setDescription('Release your claim on this ticket'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) { await interaction.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not a ticket.')], ephemeral: true }); return; }
    const member = interaction.guild.members.cache.get(interaction.user.id) ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) { await interaction.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')], ephemeral: true }); return; }
    if (!ticket.claimed_by) { await interaction.reply({ embeds: [errorEmbed('Not Claimed', 'This ticket is not claimed.')], ephemeral: true }); return; }
    await unclaimTicket(ticket.id);
    await logAction(ticket.id, interaction.user.id, 'unclaimed');
    await interaction.reply({ embeds: [infoEmbed('Unclaimed', 'This ticket is now available for other staff.')] });
  },

  async prefixExecute(message: Message): Promise<void> {
    if (!message.guild) return;
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) { await message.reply({ embeds: [errorEmbed('Not a Ticket', '')] }); return; }
    const member = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(member)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')] }); return; }
    await unclaimTicket(ticket.id);
    await logAction(ticket.id, message.author.id, 'unclaimed');
    await message.reply({ embeds: [infoEmbed('Unclaimed', 'Ticket is now available.')] });
  },
};
