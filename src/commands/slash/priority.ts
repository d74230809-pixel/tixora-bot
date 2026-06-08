import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { getTicketByChannel, updateTicketPriority, getPrioritiesForGuild, logAction } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embed.js';
import { hexToDecimal } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Set the priority of this ticket')
    .addStringOption(o => o.setName('name').setDescription('Priority name').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) { await interaction.reply({ embeds: [errorEmbed('Not a Ticket', '')], ephemeral: true }); return; }
    const member = interaction.guild.members.cache.get(interaction.user.id) ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) { await interaction.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')], ephemeral: true }); return; }
    const name = interaction.options.getString('name', true).toLowerCase();
    const priorities = await getPrioritiesForGuild(interaction.guild.id);
    const priority = priorities.find(p => p.name.toLowerCase() === name);
    if (!priority) {
      const list = priorities.map(p => `\`${p.name}\``).join(', ') || 'No priorities configured.';
      await interaction.reply({ embeds: [errorEmbed('Not Found', `Priority not found. Available: ${list}`)], ephemeral: true });
      return;
    }
    await updateTicketPriority(ticket.id, priority.id);
    await logAction(ticket.id, interaction.user.id, 'priority_changed', { priority_id: priority.id, priority_name: priority.name });
    await interaction.reply({ embeds: [infoEmbed('Priority Updated', `Priority set to **${priority.name}**`).setColor(hexToDecimal(priority.color_hex))] });
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const name = args.join(' ').toLowerCase();
    if (!name) { await message.reply({ embeds: [errorEmbed('Usage', 'T!priority <name>')] }); return; }
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) { await message.reply({ embeds: [errorEmbed('Not a Ticket', '')] }); return; }
    const executor = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(executor)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Staff only.')] }); return; }
    const priorities = await getPrioritiesForGuild(message.guild.id);
    const priority = priorities.find(p => p.name.toLowerCase() === name);
    if (!priority) { await message.reply({ embeds: [errorEmbed('Not Found', `Available: ${priorities.map(p => p.name).join(', ')}`)] }); return; }
    await updateTicketPriority(ticket.id, priority.id);
    await logAction(ticket.id, message.author.id, 'priority_changed', { priority_name: priority.name });
    await message.reply({ embeds: [infoEmbed('Priority Updated', `Set to **${priority.name}**`).setColor(hexToDecimal(priority.color_hex))] });
  },
};
