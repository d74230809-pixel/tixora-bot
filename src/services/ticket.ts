import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, EmbedBuilder, PermissionFlagsBits,
  type Guild as DiscordGuild, type GuildMember, type TextChannel,
} from 'discord.js';
import { createTicket, logAction, saveTranscript, closeTicket } from '../database/queries.js';

export async function openTicket(options: {
  guild: DiscordGuild;
  member: GuildMember;
  categoryId?: string | null;
  formAnswers?: Record<string, string>;
}): Promise<TextChannel> {
  const { guild, member, categoryId, formAnswers } = options;
  
  // 1. Create the channel first for immediate feedback
  const channelName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
    ],
  }) as TextChannel;

  // 2. Persist to DB asynchronously to not block the Discord response
  const ticketData = {
    guild_id: guild.id,
    channel_id: channel.id,
    opener_id: member.id,
    status: 'open',
    category_id: categoryId || null,
    form_answers_json: formAnswers ? JSON.stringify(formAnswers) : null,
    opened_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  const dbTicket = await createTicket(ticketData);
  await logAction(dbTicket.id, member.id, 'ticket_opened');

  // 3. Send the initial message
  const embed = new EmbedBuilder()
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setTitle(`Ticket: ${categoryId ? 'Support' : 'General Support'}`)
    .setDescription(`Hello ${member}, staff will be with you shortly. Use the buttons below to manage this ticket.`)
    .setColor(0x5865F2)
    .addFields(
      { name: '👤 Opener', value: `<@${member.id}>`, inline: true },
      { name: '📂 Category', value: categoryId || 'General', inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Tixora Support' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket_close:${dbTicket.id}`).setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId(`ticket_claim:${dbTicket.id}`).setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('🙋'),
    new ButtonBuilder().setCustomId(`ticket_tools:${dbTicket.id}`).setLabel('Tools').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
  );

  await channel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });

  if (formAnswers && Object.keys(formAnswers).length > 0) {
    const answersEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Form Responses')
      .addFields(Object.entries(formAnswers).map(([k, v]) => ({ name: k, value: v.slice(0, 1024), inline: false })));
    await channel.send({ embeds: [answersEmbed] });
  }

  return channel;
}

export async function processTicketClose(ticket: any, closedBy: string, reason?: string): Promise<void> {
  await closeTicket(ticket.id, reason);
  await logAction(ticket.id, closedBy, 'ticket_closed', { reason });
}

export async function buildAndSendTranscript(ticket: any, channel: TextChannel): Promise<void> {
  // Fetch messages and save to DB
  const messages = await channel.messages.fetch({ limit: 100 });
  const transcriptData = messages.map(m => ({
    author: m.author.tag,
    content: m.content,
    timestamp: m.createdAt.toISOString()
  }));
  await saveTranscript(ticket.id, transcriptData);
}
