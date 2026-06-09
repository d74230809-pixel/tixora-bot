import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { getTicketByChannel, updateTicketPriority, getPrioritiesForGuild, logAction } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Set or clear the priority of this ticket')
    .addStringOption(o =>
      o.setName('level')
        .setDescription('Priority level name (or "clear" to remove)')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      await interaction.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not an active ticket.')], ephemeral: true });
      return;
    }
    const member = interaction.guild.members.cache.get(interaction.user.id)
      ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await isStaff(member)) {
      await interaction.reply({ embeds: [errorEmbed('No Permission', 'Only staff can change priority.')], ephemeral: true });
      return;
    }

    const levelInput = interaction.options.getString('level', true).toLowerCase();

    if (levelInput === 'clear' || levelInput === 'none') {
      await updateTicketPriority(ticket.id, null);
      await logAction(ticket.id, interaction.user.id, 'priority_changed', { priority: null });
      await interaction.reply({ embeds: [successEmbed('Priority Cleared', 'Priority has been removed from this ticket.')] });
      return;
    }

    const priorities = await getPrioritiesForGuild(interaction.guild.id);
    if (priorities.length === 0) {
      await interaction.reply({
        embeds: [infoEmbed('No Priorities', 'No priority levels are configured for this server. Add them from the dashboard.')],
        ephemeral: true,
      });
      return;
    }

    const match = priorities.find(p =>
      p.name.toLowerCase() === levelInput ||
      p.name.toLowerCase().startsWith(levelInput),
    );

    if (!match) {
      const list = priorities.map(p => `\`${p.name}\``).join(', ');
      await interaction.reply({
        embeds: [errorEmbed('Priority Not Found', `Available priorities: ${list}\nOr use \`clear\` to remove priority.`)],
        ephemeral: true,
      });
      return;
    }

    await updateTicketPriority(ticket.id, match.id);
    await logAction(ticket.id, interaction.user.id, 'priority_changed', { priority: match.name });
    await interaction.reply({
      embeds: [successEmbed('Priority Updated', `Priority set to **${match.name}**`)],
    });
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const levelInput = args.join(' ').toLowerCase();
    if (!levelInput) {
      await message.reply({ embeds: [errorEmbed('Usage', 'T!priority <level> or T!priority clear')] });
      return;
    }

    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) {
      await message.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not an active ticket.')] });
      return;
    }

    const member = message.guild.members.cache.get(message.author.id)
      ?? await message.guild.members.fetch(message.author.id);
    if (!await isStaff(member)) {
      await message.reply({ embeds: [errorEmbed('No Permission', 'Only staff can change priority.')] });
      return;
    }

    if (levelInput === 'clear' || levelInput === 'none') {
      await updateTicketPriority(ticket.id, null);
      await logAction(ticket.id, message.author.id, 'priority_changed', { priority: null });
      await message.reply({ embeds: [successEmbed('Priority Cleared', 'Priority removed.')] });
      return;
    }

    const priorities = await getPrioritiesForGuild(message.guild.id);
    const match = priorities.find(p =>
      p.name.toLowerCase() === levelInput || p.name.toLowerCase().startsWith(levelInput),
    );
    if (!match) {
      const list = priorities.map(p => `\`${p.name}\``).join(', ') || 'none configured';
      await message.reply({ embeds: [errorEmbed('Not Found', `Available: ${list}`)] });
      return;
    }

    await updateTicketPriority(ticket.id, match.id);
    await logAction(ticket.id, message.author.id, 'priority_changed', { priority: match.name });
    await message.reply({ embeds: [successEmbed('Priority Updated', `Set to **${match.name}**`)] });
  },
};
