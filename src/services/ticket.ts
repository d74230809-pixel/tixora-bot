import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, EmbedBuilder, PermissionFlagsBits,
  type Guild as DiscordGuild, type GuildMember, type TextChannel,
} from 'discord.js';
import {
  createTicket, closeTicket, logAction, saveTranscript,
  saveAiSummary, getGuild, getCategoryById, getPriorityById, getFormById,
} from '../database/queries.js';
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

  const category = categoryId ? await getCategoryById(categoryId) : null;
  const guildConfig = await getGuild(guild.id);

  // 1. Enforce max_open_per_user if set
  if (category?.max_open_per_user) {
    const { data: openTickets } = await (await import('../database/client.js')).getSupabase()
      .from('tickets')
      .select('id')
      .eq('guild_id', guild.id)
      .eq('opener_id', member.id)
      .eq('category_id', categoryId)
      .eq('status', 'open');
    
    if (openTickets && openTickets.length >= category.max_open_per_user) {
      throw new Error(`You already have ${openTickets.length} open ticket(s) in this category. Please close them before opening a new one.`);
    }
  }

  // Find or create ticket category channel
  let parentId: string | undefined;
  if (category?.target_channel_id) {
    parentId = category.target_channel_id;
  }

  // 2. Custom Naming Scheme
  let channelName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  if (category?.naming_scheme) {
    channelName = category.naming_scheme
      .replace('{username}', member.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .replace('{id}', member.id)
      .slice(0, 100);
  } else {
    channelName += `-${Date.now().toString(36)}`;
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
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

  // Create ticket record in DB (with form answers if present)
  const ticket = await createTicket({
    guild_id: guild.id,
    channel_id: channel.id,
    opener_id: member.id,
    category_id: categoryId ?? null,
    priority_id: category?.default_priority_id ?? null,
    form_answers_json: formAnswers ?? null,
  });

  await logAction(ticket.id, member.id, 'opened', { category: category?.name ?? 'General' });

  // Add staff roles to channel permissions
  if (category?.staff_roles_json?.length) {
    for (const roleId of category.staff_roles_json) {
      await channel.permissionOverwrites.create(roleId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
    }
  }

  // Build opening embed
  const priorityData = ticket.priority_id ? await getPriorityById(ticket.priority_id) : null;
  const embed = ticketEmbed({
    title: `Ticket #${channel.name}`,
    description: `Hello ${member}, a staff member will assist you shortly.\n\nPlease describe your issue in detail.`,
    color: priorityData ? hexToDecimal(priorityData.color_hex) : 0x5865F2,
    fields: [
      { name: 'Opened by', value: `<@${member.id}>`, inline: true },
      { name: 'Category', value: category?.name ?? 'General', inline: true },
      ...(priorityData ? [{ name: 'Priority', value: priorityData.name, inline: true }] : []),
    ],
    footer: 'Powered by Tixora',
  });

  // 3. Custom Welcome Message
  if (category?.welcome_message) {
    embed.setDescription(category.welcome_message.replace('{user}', `<@${member.id}>`));
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket_close:${ticket.id}`).setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId(`ticket_claim:${ticket.id}`).setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('🙋'),
  );

  await channel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });

  // If form answers provided, send them as a follow-up embed in the ticket
  if (formAnswers && Object.keys(formAnswers).length > 0) {
    // Get form question labels for display
    let questionLabels: Record<string, string> = {};
    try {
      const formId = category?.form_id;
      if (formId) {
        const form = await getFormById(formId);
        if (form) {
          for (const q of form.questions_json as { id: string; label: string }[]) {
            questionLabels[q.id] = q.label;
          }
        }
      }
    } catch { /* ignore */ }

    const answersEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Form Responses')
      .setDescription('The user submitted the following information:')
      .addFields(
        Object.entries(formAnswers)
          .filter(([, v]) => v.trim())
          .map(([id, value]) => ({
            name: questionLabels[id] ?? id,
            value: value.slice(0, 1024),
            inline: false,
          }))
      )
      .setTimestamp();

    await channel.send({ embeds: [answersEmbed] });
  }

  return channel;
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
      .setDescription(`**AI Summary**\n${summary}`)
      .addFields(
        { name: 'Ticket ID', value: `\`${ticket.id}\``, inline: true },
        { name: 'Opened by', value: `<@${ticket.opener_id}>`, inline: true },
        { name: 'Category', value: category?.name ?? 'General', inline: true },
        { name: 'Transcript', value: `[View full transcript](${transcriptUrl})`, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Powered by Tixora' });

    if (guildConfig?.log_channel_id) {
      const logChannel = channel.guild.channels.cache.get(guildConfig.log_channel_id) as TextChannel | undefined;
      if (logChannel) await logChannel.send({ embeds: [embed] });
    }

    if (guildConfig?.transcript_channel_id && guildConfig.transcript_channel_id !== guildConfig.log_channel_id) {
      const transcriptChannel = channel.guild.channels.cache.get(guildConfig.transcript_channel_id) as TextChannel | undefined;
      if (transcriptChannel) await transcriptChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Error building transcript:', err);
  }
}
