import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { addToBlacklist, removeFromBlacklist, isBlacklisted } from '../../database/queries.js';
import { canManage } from '../../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Manage the ticket blacklist')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s =>
      s.setName('add').setDescription('Block a user from opening tickets')
        .addUserOption(o => o.setName('user').setDescription('User to block').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for blacklisting').setRequired(false)),
    )
    .addSubcommand(s =>
      s.setName('remove').setDescription('Unblock a blacklisted user')
        .addUserOption(o => o.setName('user').setDescription('User to unblock').setRequired(true)),
    )
    .addSubcommand(s =>
      s.setName('check').setDescription('Check if a user is blacklisted')
        .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    const member = interaction.guild.members.cache.get(interaction.user.id)
      ?? await interaction.guild.members.fetch(interaction.user.id);
    if (!await canManage(member)) {
      await interaction.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Guild to use this command.')], ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user', true);

    if (sub === 'add') {
      const reason = interaction.options.getString('reason') ?? undefined;
      await addToBlacklist(interaction.guild.id, target.id, interaction.user.id, reason);
      await interaction.reply({
        embeds: [successEmbed('User Blacklisted', `<@${target.id}> has been blocked from opening tickets.${reason ? `\nReason: ${reason}` : ''}`)],
      });
    } else if (sub === 'remove') {
      const banned = await isBlacklisted(interaction.guild.id, target.id);
      if (!banned) {
        await interaction.reply({ embeds: [errorEmbed('Not Blacklisted', `<@${target.id}> is not on the blacklist.`)], ephemeral: true });
        return;
      }
      await removeFromBlacklist(interaction.guild.id, target.id);
      await interaction.reply({ embeds: [successEmbed('Removed from Blacklist', `<@${target.id}> can now open tickets.`)] });
    } else if (sub === 'check') {
      const banned = await isBlacklisted(interaction.guild.id, target.id);
      await interaction.reply({
        embeds: [infoEmbed('Blacklist Check', `<@${target.id}> is ${banned ? '**blacklisted**' : '**not blacklisted**'}.`)],
        ephemeral: true,
      });
    }
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const member = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    if (!await canManage(member)) { await message.reply({ embeds: [errorEmbed('No Permission', 'Manage Guild required.')] }); return; }

    const [sub, ...rest] = args;
    if (!sub) { await message.reply({ embeds: [errorEmbed('Usage', 'T!blacklist add/remove/check <@user> [reason]')] }); return; }

    const userId = rest[0]?.replace(/[<@!>]/g, '');
    if (!userId) { await message.reply({ embeds: [errorEmbed('Usage', 'Provide a user mention or ID.')] }); return; }

    if (sub === 'add') {
      const reason = rest.slice(1).join(' ') || undefined;
      await addToBlacklist(message.guild.id, userId, message.author.id, reason);
      await message.reply({ embeds: [successEmbed('Blacklisted', `<@${userId}> blocked from tickets.${reason ? ` Reason: ${reason}` : ''}`)] });
    } else if (sub === 'remove') {
      await removeFromBlacklist(message.guild.id, userId);
      await message.reply({ embeds: [successEmbed('Unblacklisted', `<@${userId}> can now open tickets.`)] });
    } else if (sub === 'check') {
      const banned = await isBlacklisted(message.guild.id, userId);
      await message.reply({ embeds: [infoEmbed('Check', `<@${userId}> is ${banned ? 'blacklisted' : 'not blacklisted'}.`)] });
    }
  },
};
