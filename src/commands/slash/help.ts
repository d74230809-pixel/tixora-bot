import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { TIXORA_COLOR } from '../../utils/embed.js';

const categories = [
  {
    name: 'Ticket Actions',
    value: [
      '`/close [reason]` — Close this ticket with an optional reason (or via popup modal)',
      '`/reopen` — Reopen a closed ticket and restore user access',
      '`/claim` — Claim ownership of this ticket — shows you are handling it',
      '`/unclaim` — Release your claim so another staff can take it',
      '`/add <@user>` — Grant a user access to view and reply in this ticket',
      '`/remove <@user>` — Remove a user\'s access from this ticket',
      '`/ticket` — View full ticket details: status, age, history, notes',
    ].join('\n'),
  },
  {
    name: 'Organization & Tools',
    value: [
      '`/priority <level>` — Set ticket priority (use a name from your configured levels, or `clear`)',
      '`/tag add <name>` — Add a searchable label to this ticket',
      '`/tag remove <name>` — Remove a label from this ticket',
      '`/note <text>` — Add a private staff note (auto-deletes in 30s, saved to dashboard)',
      '`/canned <name>` — Send a saved canned reply — saves time on common responses',
    ].join('\n'),
  },
  {
    name: 'Stats & Monitoring',
    value: [
      '`/stats` — Server-wide ticket stats: open, closed, average rating, claimed/unclaimed',
      '`/sla` — Check if this ticket has breached your configured response/resolution targets',
      '`/ping` — Check bot latency and WebSocket health',
    ].join('\n'),
  },
  {
    name: 'Administration',
    value: [
      '`/setup` — Opens a link to your Tixora dashboard for full server configuration',
      '`/blacklist add <@user> [reason]` — Block a user from opening tickets',
      '`/blacklist remove <@user>` — Unblock a blacklisted user',
      '`/blacklist check <@user>` — Check whether a user is blocked',
    ].join('\n'),
  },
  {
    name: 'Prefix Commands (T! prefix)',
    value: [
      'Every command above also works as a prefix command: `T!close`, `T!claim`, `T!stats`, etc.',
      'The prefix is configurable per-server from the dashboard (default: `T!`)',
      'Prefix: `T!help`, `T!close [reason]`, `T!claim`, `T!unclaim`, `T!add @user`, `T!remove @user`',
      '`T!note <text>`, `T!canned <name>`, `T!priority <level>`, `T!stats`, `T!ping`, `T!sla`',
    ].join('\n'),
  },
];

function buildEmbed(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(TIXORA_COLOR)
    .setTitle('Tixora — Command Reference')
    .setDescription(
      '**Tixora** is a professional Discord ticket bot.\nAll slash commands work inside any ticket channel. Staff commands require a configured staff role.\n\u200b',
    )
    .setFooter({ text: 'Tixora Ticket Bot • Dashboard: /setup • All commands work as /slash and T!prefix' })
    .setTimestamp();

  for (const cat of categories) {
    embed.addFields({ name: `▸ ${cat.name}`, value: cat.value });
  }
  return embed;
}

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all Tixora commands — visible to everyone in the channel'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // NOT ephemeral — visible to everyone
    await interaction.reply({ embeds: [buildEmbed()] });
  },

  async prefixExecute(message: Message): Promise<void> {
    await message.reply({ embeds: [buildEmbed()] });
  },
};
