import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { addToBlacklist, removeFromBlacklist, isBlacklisted } from '../../database/queries.js';
import { canManage } from '../../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Manage the ticket blacklist')
    .addSubcommand(s => s.setName('add').setDescription('Blacklist a user')
      .addUserOption(o => o.setName('user').setDescription('User to blacklist').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove from blacklist')
      .addUserOption(o => o.setName('user').setDescription('User to unban from tickets').setRequired(true)))
    .addSubcommand(s => s.setName('check').setDescription('Check if a user is blacklisted')
      .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true))),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const member = interaction.guild.members.cache.get(interaction.user.id) ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await canManage(member)) { await interaction.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Guild permission.')], ephemeral: true }); return; }
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user', true);
    if (sub === 'add') {
      const reason = interaction.options.getString('reason') ?? undefined;
      await addToBlacklist(interaction.guild.id, target.id, interaction.user.id, reason);
      await interaction.reply({ embeds: [successEmbed('Blacklisted', `<@${target.id}> has been blacklisted from opening tickets.${reason ? `\n**Reason:** ${reason}` : ''}`)] });
    } else if (sub === 'remove') {
      await removeFromBlacklist(interaction.guild.id, target.id);
      await interaction.reply({ embeds: [successEmbed('Unblacklisted', `<@${target.id}> can now open tickets again.`)] });
    } else if (sub === 'check') {
      const banned = await isBlacklisted(interaction.guild.id, target.id);
      await interaction.reply({ embeds: [infoEmbed('Blacklist Check', `<@${target.id}> is **${banned ? 'blacklisted 🚫' : 'not blacklisted ✅'}**`)], ephemeral: true });
    }
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const [sub, mention, ...rest] = args;
    const userId = mention?.replace(/[<@!>]/g, '');
    if (!sub || !userId) { await message.reply({ embeds: [errorEmbed('Usage', 'T!blacklist add/remove/check <@user>')] }); return; }
    const executor = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await canManage(executor)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Manage Guild required.')] }); return; }
    if (sub === 'add') {
      await addToBlacklist(message.guild.id, userId, message.author.id, rest.join(' ') || undefined);
      await message.reply({ embeds: [successEmbed('Blacklisted', `<@${userId}> blacklisted.`)] });
    } else if (sub === 'remove') {
      await removeFromBlacklist(message.guild.id, userId);
      await message.reply({ embeds: [successEmbed('Unblacklisted', `<@${userId}> can open tickets again.`)] });
    } else if (sub === 'check') {
      const banned = await isBlacklisted(message.guild.id, userId);
      await message.reply({ embeds: [infoEmbed('Blacklist Check', `<@${userId}> is **${banned ? 'blacklisted 🚫' : 'not blacklisted ✅'}**`)] });
    }
  },
};
