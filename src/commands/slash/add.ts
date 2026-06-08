import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type Message, type TextChannel } from 'discord.js';
import { getTicketByChannel, addMemberToTicket, logAction } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a member to this ticket')
    .addUserOption(o => o.setName('member').setDescription('Member to add').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) { await interaction.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not an active ticket.')], ephemeral: true }); return; }
    const member = interaction.guild.members.cache.get(interaction.user.id) ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) { await interaction.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')], ephemeral: true }); return; }
    const target = interaction.options.getUser('member', true);
    const channel = interaction.channel as TextChannel;
    await channel.permissionOverwrites.create(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await addMemberToTicket(ticket.id, target.id, interaction.user.id);
    await logAction(ticket.id, interaction.user.id, 'member_added', { user_id: target.id, username: target.username });
    await interaction.reply({ embeds: [successEmbed('Member Added', `<@${target.id}> has been added to this ticket.`)] });
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const userId = args[0]?.replace(/[<@!>]/g, '');
    if (!userId) { await message.reply({ embeds: [errorEmbed('Usage', 'T!add <@member>')] }); return; }
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) { await message.reply({ embeds: [errorEmbed('Not a Ticket', '')] }); return; }
    const executor = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(executor)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')] }); return; }
    const channel = message.channel as TextChannel;
    await channel.permissionOverwrites.create(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await addMemberToTicket(ticket.id, userId, message.author.id);
    await logAction(ticket.id, message.author.id, 'member_added', { user_id: userId });
    await message.reply({ embeds: [successEmbed('Member Added', `<@${userId}> has been added.`)] });
  },
};
