import {
  type Interaction, type ChatInputCommandInteraction,
  type ButtonInteraction, type ModalSubmitInteraction,
  ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ButtonBuilder, ButtonStyle,
} from 'discord.js';
import type { SlashCommand } from '../bot.js';
import {
  getTicketByChannel, getTicketById, claimTicket,
  logAction, ensureGuild, isBlacklisted, saveRating,
  getCategoryById, getFormById,
} from '../database/queries.js';
import { openTicket, processTicketClose, buildAndSendTranscript } from '../services/ticket.js';
import { isStaff } from '../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../utils/embed.js';
import type { Form } from '../types/index.js';

// Build a Discord modal from a form's questions
function buildFormModal(form: Form, categoryId: string | null, directFormId?: string): ModalBuilder {
  const customId = `form_ticket_submit:${categoryId ?? 'null'}:${directFormId ?? 'null'}`;
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(form.name.slice(0, 45));

  const questions = (form.questions_json as {
    id: string;
    label: string;
    type: 'short' | 'paragraph' | 'dropdown';
    required?: boolean;
    placeholder?: string;
  }[]).slice(0, 5); // Discord modals support max 5 components

  for (const q of questions) {
    const input = new TextInputBuilder()
      .setCustomId(q.id)
      .setLabel(q.label.slice(0, 45))
      .setStyle(q.type === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(q.required ?? false)
      .setMaxLength(q.type === 'paragraph' ? 1000 : 250);

    if (q.placeholder) {
      input.setPlaceholder(q.placeholder.slice(0, 100));
    }

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  }

  return modal;
}

export default async function onInteraction(
  interaction: Interaction,
  commands: Map<string, SlashCommand>,
): Promise<void> {
  if (interaction.isChatInputCommand()) {
    await handleSlash(interaction, commands);
  } else if (interaction.isButton()) {
    await handleButton(interaction);
  } else if (interaction.isModalSubmit()) {
    await handleModal(interaction);
  }
}

async function handleSlash(
  interaction: ChatInputCommandInteraction,
  commands: Map<string, SlashCommand>,
): Promise<void> {
  const command = commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Slash] Error in /${interaction.commandName}:`, err);
    const reply = { embeds: [errorEmbed('Command failed', 'An unexpected error occurred.')], ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const [action, ...rest] = interaction.customId.split(':');

  if (!interaction.guild || !interaction.member) return;
  const member = interaction.guild.members.cache.get(interaction.user.id)
    ?? await interaction.guild.members.fetch(interaction.user.id);

  // ── Panel button — open ticket (possibly with a form modal) ──────────────
  if (action === 'panel_open') {
    const categoryId = rest[0] && rest[0] !== 'null' ? rest[0] : null;
    await ensureGuild(interaction.guild.id);

    // Blacklist check (need to defer first for this, but show modal before deferring if form exists)
    // Check category form BEFORE deferring so we can show a modal
    if (categoryId) {
      try {
        const category = await getCategoryById(categoryId);
        if (category?.form_id) {
          const form = await getFormById(category.form_id);
          if (form && (form.questions_json as unknown[]).length > 0) {
            // Check blacklist first (without deferring — we can use ephemeral reply)
            const banned = await isBlacklisted(interaction.guild.id, interaction.user.id);
            if (banned) {
              await interaction.reply({
                embeds: [errorEmbed('Blacklisted', 'You are not allowed to open tickets in this server.')],
                ephemeral: true,
              });
              return;
            }
            // Show form modal
            const modal = buildFormModal(form, categoryId);
            await interaction.showModal(modal);
            return;
          }
        }
      } catch (err) {
        console.error('[Button:panel_open] Error checking form:', err);
      }
    }

    // No form — open ticket directly
    await interaction.deferReply({ ephemeral: true });

    const banned = await isBlacklisted(interaction.guild.id, interaction.user.id);
    if (banned) {
      await interaction.editReply({ embeds: [errorEmbed('Blacklisted', 'You are not allowed to open tickets in this server.')] });
      return;
    }

    try {
      const channel = await openTicket({ guild: interaction.guild, member, categoryId });
      await interaction.editReply({ embeds: [successEmbed('Ticket Created', `Your ticket has been created: <#${channel.id}>`)] });
    } catch (err) {
      console.error('[Button:panel_open] Error opening ticket:', err);
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to create ticket. Please try again.')] });
    }
    return;
  }

  // ── Direct form button (panel_form:formId) ───────────────────────────────
  if (action === 'panel_form') {
    const formId = rest[0];
    if (!formId) return;
    await ensureGuild(interaction.guild.id);

    const banned = await isBlacklisted(interaction.guild.id, interaction.user.id);
    if (banned) {
      await interaction.reply({
        embeds: [errorEmbed('Blacklisted', 'You are not allowed to open tickets in this server.')],
        ephemeral: true,
      });
      return;
    }

    try {
      const form = await getFormById(formId);
      if (!form || (form.questions_json as unknown[]).length === 0) {
        // No form or empty form — open ticket directly
        await interaction.deferReply({ ephemeral: true });
        const channel = await openTicket({ guild: interaction.guild, member, categoryId: null });
        await interaction.editReply({ embeds: [successEmbed('Ticket Created', `Your ticket: <#${channel.id}>`)] });
        return;
      }
      const modal = buildFormModal(form, null, formId);
      await interaction.showModal(modal);
    } catch (err) {
      console.error('[Button:panel_form] Error:', err);
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to load form.')], ephemeral: true });
    }
    return;
  }

  // ── Close button ─────────────────────────────────────────────────────────
  if (action === 'ticket_close') {
    const ticketId = rest[0];
    await interaction.deferReply({ ephemeral: true });
    const staffCheck = await isStaff(member);
    if (!staffCheck && interaction.user.id !== (await getTicketById(ticketId))?.opener_id) {
      await interaction.editReply({ embeds: [errorEmbed('No Permission', 'Only staff or the ticket opener can close this ticket.')] });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`close_modal:${ticketId}`)
      .setTitle('Close Ticket')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reason for closing (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(200),
        ),
      );
    await interaction.deleteReply();
    await interaction.showModal(modal);
    return;
  }

  // ── Claim button ─────────────────────────────────────────────────────────
  if (action === 'ticket_claim') {
    const ticketId = rest[0];
    await interaction.deferReply({ ephemeral: true });
    const staffCheck = await isStaff(member);
    if (!staffCheck) {
      await interaction.editReply({ embeds: [errorEmbed('No Permission', 'Only staff can claim tickets.')] });
      return;
    }
    await claimTicket(ticketId, interaction.user.id);
    await logAction(ticketId, interaction.user.id, 'claimed');
    await interaction.editReply({ embeds: [successEmbed('Claimed', 'You have claimed this ticket.')] });
    if (interaction.channel && 'send' in interaction.channel) {
      await interaction.channel.send({ embeds: [infoEmbed('Ticket Claimed', `<@${interaction.user.id}> has claimed this ticket.`)] });
    }
    return;
  }

  // ── Rating buttons ───────────────────────────────────────────────────────
  if (action === 'rate') {
    const [ticketId, ratingStr] = rest;
    const rating = parseInt(ratingStr, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) return;
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) return;
    await saveRating(ticketId, interaction.guildId, interaction.user.id, rating);
    await interaction.editReply({ embeds: [successEmbed('Thank you!', `You rated this ticket **${rating}/5 ⭐**`)] });
    if (interaction.message) {
      await interaction.message.edit({ components: [] }).catch(() => null);
    }
    return;
  }
}

async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  const [action, ...rest] = interaction.customId.split(':');

  // ── Form ticket submit (from panel_open or panel_form with a form) ────────
  if (action === 'form_ticket_submit') {
    const categoryId = rest[0] !== 'null' ? rest[0] : null;

    if (!interaction.guild || !interaction.member) return;
    const member = interaction.guild.members.cache.get(interaction.user.id)
      ?? await interaction.guild.members.fetch(interaction.user.id);

    await interaction.deferReply({ ephemeral: true });

    // Extract form answers from modal fields
    const formAnswers: Record<string, string> = {};
    for (const [fieldId, component] of interaction.fields.fields) {
      formAnswers[fieldId] = component.value;
    }

    try {
      const channel = await openTicket({
        guild: interaction.guild,
        member,
        categoryId,
        formAnswers,
      });
      await interaction.editReply({
        embeds: [successEmbed('Ticket Created', `Your ticket has been created: <#${channel.id}>`)],
      });
    } catch (err) {
      console.error('[Modal:form_ticket_submit] Error:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Error', 'Failed to create your ticket. Please try again.')],
      });
    }
    return;
  }

  // ── Close modal ───────────────────────────────────────────────────────────
  if (action === 'close_modal') {
    const ticketId = rest[0];
    const reason = interaction.fields.getTextInputValue('reason') || undefined;
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.channel || !('messages' in interaction.channel)) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Could not find ticket channel.')] });
      return;
    }

    const ticket = await getTicketByChannel(interaction.channel.id) ?? await getTicketById(ticketId);
    if (!ticket) {
      await interaction.editReply({ embeds: [errorEmbed('Not Found', 'Ticket not found or already closed.')] });
      return;
    }

    await interaction.editReply({ embeds: [infoEmbed('Closing...', 'Saving transcript and generating AI summary...')] });
    await processTicketClose(ticket, interaction.user.id, reason);

    const textChannel = interaction.channel as import('discord.js').TextChannel;
    await buildAndSendTranscript(ticket, textChannel);

    // Rating prompt
    const ratingRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      [1, 2, 3, 4, 5].map(n =>
        new ButtonBuilder()
          .setCustomId(`rate:${ticket.id}:${n}`)
          .setLabel(`${n}⭐`)
          .setStyle(n <= 2 ? ButtonStyle.Danger : n === 3 ? ButtonStyle.Secondary : ButtonStyle.Success),
      ),
    );
    await textChannel.send({
      content: `<@${ticket.opener_id}> — How was your support experience?`,
      components: [ratingRow],
    });

    // Lock channel
    await textChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: false, ViewChannel: false });
    await textChannel.permissionOverwrites.edit(ticket.opener_id, { SendMessages: false, ViewChannel: true });
    await textChannel.send({
      embeds: [infoEmbed('Ticket Closed', `Closed by <@${interaction.user.id}>${reason ? ` — ${reason}` : '.'}`)],
    });
  }
}
