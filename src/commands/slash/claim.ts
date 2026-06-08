import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { getTicketByChannel, claimTicket, logAction } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder().setName('claim').setDescription('Claim this ticket as your own'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) { await interaction.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not an active ticket.')], ephemeral: true }); return; }
    const member = interaction.guild.members.cache.get(interaction.user.id) ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) { await interaction.reply({ embeds: [errorEmbed('No Permission', 'Only staff can claim tickets.')], ephemeral: true }); return; }
    if (ticket.claimed_by) { await interaction.reply({ embeds: [errorEmbed('Already Claimed', `This ticket is already claimed by <@${ticket.claimed_by}>.`)], ephemeral: true }); return; }
    await claimTicket(ticket.id, interaction.user.id);
    await logAction(ticket.id, interaction.user.id, 'claimed');
    await interaction.reply({ embeds: [infoEmbed('Ticket Claimed', `<@${interaction.user.id}> has claimed this ticket.`)] });
  },

  async prefixExecute(message: Message): Promise<void> {
    if (!message.guild) return;
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) { await message.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not an active ticket.')] }); return; }
    const member = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(member)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Only staff can claim tickets.')] }); return; }
    if (ticket.claimed_by) { await message.reply({ embeds: [errorEmbed('Already Claimed', `Claimed by <@${ticket.claimed_by}>.`)] }); return; }
    await claimTicket(ticket.id, message.author.id);
    await logAction(ticket.id, message.author.id, 'claimed');
    await message.reply({ embeds: [infoEmbed('Ticket Claimed', `<@${message.author.id}> has claimed this ticket.`)] });
  },
};
