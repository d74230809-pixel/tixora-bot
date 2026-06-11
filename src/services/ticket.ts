import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, EmbedBuilder, PermissionFlagsBits,
  type Guild as DiscordGuild, type GuildMember, type TextChannel,
} from 'discord.js';

export async function openTicket(options: {
  guild: DiscordGuild;
  member: GuildMember;
  categoryId?: string | null;
  formAnswers?: Record<string, string>;
}): Promise<TextChannel> {
  const { guild, member, formAnswers } = options;
  
  // NO DATABASE - INSTANT CREATION
  const channelName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;
  
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
    ],
  }) as TextChannel;

  const embed = new EmbedBuilder()
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setTitle(`Ticket: General Support`)
    .setDescription(`Hello ${member}, staff will be with you shortly. Use the buttons below to manage this ticket.`)
    .setColor(0x5865F2)
    .addFields(
      { name: '👤 Opener', value: `<@${member.id}>`, inline: true },
      { name: '📂 Category', value: 'General', inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Tixora Support' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket_close:none`).setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId(`ticket_claim:none`).setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('🙋'),
    new ButtonBuilder().setCustomId(`ticket_tools:none`).setLabel('Tools').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
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
  // Logic handled in interactionCreate.ts for No-DB mode
}

export async function buildAndSendTranscript(ticket: any, channel: TextChannel): Promise<void> {
  // Transcript disabled in No-DB mode
}
