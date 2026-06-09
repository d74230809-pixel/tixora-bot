import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { TIXORA_COLOR } from '../../utils/embed.js';

const categories = [
  {
    name: 'Ticket Management',
    emoji: '🎫',
    commands: [
      { name: '/close [reason]', desc: 'Close the current ticket (modal if no reason given)', type: 'Ticket' },
      { name: '/reopen', desc: 'Reopen a closed ticket', type: 'Ticket' },
      { name: '/claim', desc: 'Claim ownership of this ticket', type: 'Ticket' },
      { name: '/unclaim', desc: 'Release your claim on this ticket', type: 'Ticket' },
      { name: '/add <member>', desc: 'Add a member to this ticket', type: 'Ticket' },
      { name: '/remove <member>', desc: 'Remove a member from this ticket', type: 'Ticket' },
      { name: '/ticket', desc: 'Show ticket details, status, and history', type: 'Ticket' },
    ],
  },
  {
    name: 'Organization',
    emoji: '📋',
    commands: [
      { name: '/tag add <name>', desc: 'Add a label/tag to this ticket', type: 'Staff' },
      { name: '/tag remove <name>', desc: 'Remove a tag from this ticket', type: 'Staff' },
      { name: '/priority <level>', desc: 'Set the priority level (low/medium/high/urgent)', type: 'Staff' },
      { name: '/note <content>', desc: 'Add a private staff-only note (invisible to user)', type: 'Staff' },
      { name: '/canned <name>', desc: 'Send a saved canned reply template', type: 'Staff' },
    ],
  },
  {
    name: 'Analytics & Monitoring',
    emoji: '📊',
    commands: [
      { name: '/stats', desc: 'Server ticket statistics: total, open, closed, avg rating', type: 'Staff' },
      { name: '/sla', desc: 'Check SLA breach status for the current ticket', type: 'Staff' },
      { name: '/ping', desc: 'Check bot latency and connection health', type: 'All' },
    ],
  },
  {
    name: 'Administration',
    emoji: '⚙️',
    commands: [
      { name: '/setup', desc: 'Open the Tixora dashboard for full server configuration', type: 'Admin' },
      { name: '/blacklist add <user>', desc: 'Block a user from opening tickets', type: 'Admin' },
      { name: '/blacklist remove <user>', desc: 'Unblock a blacklisted user', type: 'Admin' },
    ],
  },
];

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all Tixora commands and their descriptions'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setTitle('Tixora — Command Reference')
      .setDescription(
        'All commands work as `/slash` and `T!prefix` variants.\nPrefix commands: `T!close`, `T!claim`, `T!stats`, etc.\n\n' +
        '**Permission levels:** `All` = anyone | `Staff` = staff roles | `Admin` = Manage Server',
      )
      .setFooter({ text: 'Tixora Ticket Bot | Full docs at your dashboard' })
      .setTimestamp();

    for (const cat of categories) {
      const lines = cat.commands.map(c => `\`${c.name}\` — ${c.desc}`).join('\n');
      embed.addFields({ name: `${cat.emoji} ${cat.name}`, value: lines });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async prefixExecute(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setTitle('Tixora — Command Reference')
      .setDescription(
        'Use `/slash` or `T!prefix` for any command below.\n\n' +
        '**Quick start:** `T!close`, `T!claim`, `T!stats`, `T!ping`',
      )
      .setFooter({ text: 'Full list: /help | Dashboard: /setup' })
      .setTimestamp();

    for (const cat of categories) {
      const lines = cat.commands.map(c => `**${c.name}** — ${c.desc}`).join('\n');
      embed.addFields({ name: `${cat.emoji} ${cat.name}`, value: lines });
    }

    await message.reply({ embeds: [embed] });
  },
};
