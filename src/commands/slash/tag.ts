import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { getTicketByChannel, addTagToTicket, removeTagFromTicket, logAction } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { successEmbed, errorEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Add or remove a tag on this ticket')
    .addSubcommand(s => s.setName('add').setDescription('Add a tag').addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a tag').addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) { await interaction.reply({ embeds: [errorEmbed('Not a Ticket', '')], ephemeral: true }); return; }
    const member = interaction.guild.members.cache.get(interaction.user.id) ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) { await interaction.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')], ephemeral: true }); return; }
    const sub = interaction.options.getSubcommand();
    const tag = interaction.options.getString('name', true).toLowerCase().replace(/\s+/g, '-');
    if (sub === 'add') {
      await addTagToTicket(ticket.id, tag);
      await logAction(ticket.id, interaction.user.id, 'tag_added', { tag });
      await interaction.reply({ embeds: [successEmbed('Tag Added', `Tag \`${tag}\` added.`)] });
    } else {
      await removeTagFromTicket(ticket.id, tag);
      await logAction(ticket.id, interaction.user.id, 'tag_removed', { tag });
      await interaction.reply({ embeds: [successEmbed('Tag Removed', `Tag \`${tag}\` removed.`)] });
    }
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const [sub, ...rest] = args;
    const tag = rest.join('-').toLowerCase();
    if (!sub || !tag) { await message.reply({ embeds: [errorEmbed('Usage', 'T!tag add/remove <name>')] }); return; }
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) { await message.reply({ embeds: [errorEmbed('Not a Ticket', '')] }); return; }
    const executor = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(executor)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')] }); return; }
    if (sub === 'add') {
      await addTagToTicket(ticket.id, tag);
      await logAction(ticket.id, message.author.id, 'tag_added', { tag });
      await message.reply({ embeds: [successEmbed('Tag Added', `\`${tag}\` added.`)] });
    } else if (sub === 'remove') {
      await removeTagFromTicket(ticket.id, tag);
      await logAction(ticket.id, message.author.id, 'tag_removed', { tag });
      await message.reply({ embeds: [successEmbed('Tag Removed', `\`${tag}\` removed.`)] });
    }
  },
};
