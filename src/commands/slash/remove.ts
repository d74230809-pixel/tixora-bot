import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message, type TextChannel } from 'discord.js';
import { getTicketByChannel, removeMemberFromTicket, logAction } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a member from this ticket')
    .addUserOption(o => o.setName('member').setDescription('Member to remove').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) { await interaction.reply({ embeds: [errorEmbed('Not a Ticket', '')], ephemeral: true }); return; }
    const member = interaction.guild.members.cache.get(interaction.user.id) ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) { await interaction.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')], ephemeral: true }); return; }
    const target = interaction.options.getUser('member', true);
    if (target.id === ticket.opener_id) { await interaction.reply({ embeds: [errorEmbed('Cannot Remove', 'You cannot remove the ticket opener.')], ephemeral: true }); return; }
    const channel = interaction.channel as TextChannel;
    await channel.permissionOverwrites.delete(target.id);
    await removeMemberFromTicket(ticket.id, target.id);
    await logAction(ticket.id, interaction.user.id, 'member_removed', { user_id: target.id, username: target.username });
    await interaction.reply({ embeds: [successEmbed('Member Removed', `<@${target.id}> has been removed from this ticket.`)] });
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const userId = args[0]?.replace(/[<@!>]/g, '');
    if (!userId) { await message.reply({ embeds: [errorEmbed('Usage', 'T!remove <@member>')] }); return; }
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) { await message.reply({ embeds: [errorEmbed('Not a Ticket', '')] }); return; }
    const executor = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(executor)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')] }); return; }
    if (userId === ticket.opener_id) { await message.reply({ embeds: [errorEmbed('Cannot Remove', 'Cannot remove the ticket opener.')] }); return; }
    const channel = message.channel as TextChannel;
    await channel.permissionOverwrites.delete(userId);
    await removeMemberFromTicket(ticket.id, userId);
    await logAction(ticket.id, message.author.id, 'member_removed', { user_id: userId });
    await message.reply({ embeds: [successEmbed('Removed', `<@${userId}> removed from ticket.`)] });
  },
};
