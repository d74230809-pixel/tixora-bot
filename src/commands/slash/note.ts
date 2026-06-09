import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { getTicketByChannel } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { db } from '../../database/client.js';
import { errorEmbed, TIXORA_COLOR } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add a staff-only internal note to this ticket (invisible to ticket opener)')
    .addStringOption(o => o.setName('content').setDescription('Note content').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      await interaction.reply({ content: 'Use inside a ticket channel only.', ephemeral: true });
      return;
    }
    const member = interaction.guild.members.cache.get(interaction.user.id)
      ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) {
      await interaction.reply({ embeds: [errorEmbed('No Permission', 'Only staff can add notes.')], ephemeral: true });
      return;
    }
    const content = interaction.options.getString('content', true);
    await db.from('internal_notes').insert({
      ticket_id: ticket.id,
      guild_id: interaction.guildId!,
      author_id: interaction.user.id,
      content,
    });

    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setTitle('Internal Staff Note')
      .setDescription(content)
      .addFields({ name: 'Added by', value: `<@${interaction.user.id}>`, inline: true })
      .setFooter({ text: 'This note is only visible to staff' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    // Delete after 30s so note is not permanently visible in channel
    const reply = await interaction.fetchReply();
    setTimeout(() => reply.delete().catch(() => null), 30_000);
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const content = args.join(' ');
    if (!content) { await message.reply({ embeds: [errorEmbed('Usage', 'T!note <content>')] }); return; }
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) { await message.reply({ embeds: [errorEmbed('Not a Ticket', 'Use inside a ticket channel.')] }); return; }
    const member = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(member)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')] }); return; }
    await db.from('internal_notes').insert({
      ticket_id: ticket.id,
      guild_id: message.guildId!,
      author_id: message.author.id,
      content,
    });

    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setTitle('Internal Staff Note')
      .setDescription(content)
      .setFooter({ text: 'This note is only visible to staff' })
      .setTimestamp();

    const reply = await message.reply({ embeds: [embed] });
    setTimeout(() => reply.delete().catch(() => null), 30_000);
  },
};
