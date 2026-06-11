import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, EmbedBuilder, PermissionFlagsBits,
  type Guild as DiscordGuild, type GuildMember, type TextChannel,
} from 'discord.js';
import {
  createTicket, closeTicket, logAction, saveTranscript,
  saveAiSummary, getGuild, getCategoryById, getPriorityById, getFormById,
} from '../database/queries.js';
import { db, query } from '../database/client.js';
import { fetchAllMessages } from './transcript.js';
import { generateTicketSummary } from './ai.js';
import { ticketEmbed, successEmbed, hexToDecimal } from '../utils/embed.js';
import type { Ticket } from '../types/index.js';

const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL ?? 'https://tixora.app';

export async function openTicket(options: {
  guild: DiscordGuild;
  member: GuildMember;
  categoryId?: string | null;
  formAnswers?: Record<string, string>;
}): Promise<TextChannel> {
  const { guild, member, categoryId, formAnswers } = options;

  // 1. Fail fast if category or guild is missing
  const category = categoryId ? await getCategoryById(categoryId) : null;
  const guildConfig = await getGuild(guild.id);

  // 2. Check max open tickets
  if (category?.max_open_per_user) {
    const res = await query(
      'SELECT COUNT(*) FROM tickets WHERE guild_id = $1 AND opener_id = $2 AND category_id = $3 AND status = $4',
      [guild.id, member.id, categoryId, 'open']
    );
    if (parseInt(res.rows[0].count) >= category.max_open_per_user) {
      throw new Error(`You already have ${res.rows[0].count} open ticket(s) in this category.`);
    }
  }

  // 3. Channel Naming
  let channelName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  if (category?.naming_scheme) {
    channelName = category.naming_scheme
      .replace('{username}', member.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .replace('{id}', member.id)
      .slice(0, 100);
  } else {
    channelName += `-${Date.now().toString(36)}`;
  }

  // 4. Create Channel FIRST (we deferred the interaction, so we have time)
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category?.target_channel_id || undefined,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  }) as TextChannel;

  try {
    // 5. Create DB Record
    const ticket = await createTicket({
      guild_id: guild.id,
      channel_id: channel.id,
      opener_id: member.id,
      category_id: categoryId ?? null,
      priority_id: category?.default_priority_id ?? null,
      form_answers_json: formAnswers ?? null,
    });

    await logAction(ticket.id, member.id, 'opened', { category: category?.name ?? 'General' });

    // 6. Add Staff Roles
    if (category?.staff_roles_json?.length) {
      for (const roleId of category.staff_roles_json) {
        try {
          await channel.permissionOverwrites.create(roleId, {
            ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
          });
        } catch (e) { /* ignore */ }
      }
    }

    // 7. Build Premium Welcome Embed
    const priorityData = ticket.priority_id ? await getPriorityById(ticket.priority_id) : null;
    const embed = new EmbedBuilder()
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setTitle(`Ticket: ${category?.name ?? 'General Support'}`)
      .setDescription(category?.welcome_message?.replace('{user}', `<@${member.id}>`) ?? `Hello ${member}, staff will be with you shortly.`)
      .setColor(priorityData ? hexToDecimal(priorityData.color_hex) : 0x5865F2)
      .addFields(
        { name: '👤 Opener', value: `<@${member.id}>`, inline: true },
        { name: '📂 Category', value: category?.name ?? 'General', inline: true },
        ...(priorityData ? [{ name: '⚡ Priority', value: priorityData.name, inline: true }] : []),
      )
      .setTimestamp()
      .setFooter({ text: 'Tixora Support • tixora.app' });

    // 8. Premium Action Panel
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ticket_close:${ticket.id}`).setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
      new ButtonBuilder().setCustomId(`ticket_claim:${ticket.id}`).setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('🙋'),
      new ButtonBuilder().setCustomId(`ticket_tools:${ticket.id}`).setLabel('Tools').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
    );

    // 9. Handle Pings
    let pingContent = '';
    const pingRoles = (category as any)?.ping_roles_json || [];
    if ((category as any)?.ping_opener !== false) pingContent += `<@${member.id}> `;
    if (pingRoles.length > 0) pingContent += pingRoles.map((id: string) => `<@&${id}>`).join(' ');

    const mainMessage = await channel.send({ 
      content: pingContent.trim() || undefined, 
      embeds: [embed], 
      components: [row] 
    });

    if ((category as any)?.delete_ping && pingContent.trim()) {
      setTimeout(() => mainMessage.edit({ content: '' }).catch(() => {}), 5000);
    }

    // 10. Form Responses
    if (formAnswers && Object.keys(formAnswers).length > 0) {
      const answersEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Form Responses')
        .addFields(Object.entries(formAnswers).map(([k, v]) => ({ name: k, value: v.slice(0, 1024), inline: false })));
      await channel.send({ embeds: [answersEmbed] });
    }

    return channel;
  } catch (err) {
    // Cleanup if DB fails
    await channel.delete().catch(() => {});
    throw err;
  }
}

export async function processTicketClose(ticket: Ticket, closedBy: string, reason?: string): Promise<void> {
  await closeTicket(ticket.id, reason);
  await logAction(ticket.id, closedBy, 'closed', { reason: reason ?? 'No reason provided' });
}

export async function buildAndSendTranscript(ticket: Ticket, channel: TextChannel): Promise<void> {
  try {
    const messages = await fetchAllMessages(channel);
    await saveTranscript(ticket.id, messages);
    const category = ticket.category_id ? await getCategoryById(ticket.category_id) : null;
    const summary = await generateTicketSummary(messages, category?.name);
    await saveAiSummary(ticket.id, summary);
    const guildConfig = await getGuild(ticket.guild_id);
    const transcriptUrl = `${DASHBOARD_BASE_URL}/dashboard/${ticket.guild_id}/transcripts/${ticket.id}`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔒 Ticket Closed')
      .setDescription(`**AI Summary**\n\${summary}`)
      .addFields(
        { name: 'Ticket ID', value: \`\`\`\${ticket.id}\`\`\`, inline: true },
        { name: 'Opened by', value: \`<@\${ticket.opener_id}>\`, inline: true },
        { name: 'Transcript', value: \`[View Transcript](\${transcriptUrl})\`, inline: true },
      )
      .setTimestamp();

    if (guildConfig?.log_channel_id) {
      const logChannel = channel.guild.channels.cache.get(guildConfig.log_channel_id) as TextChannel;
      if (logChannel) await logChannel.send({ embeds: [embed] });
    }
  } catch (err) { console.error('Transcript error:', err); }
}
