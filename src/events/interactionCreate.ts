import {
  type Interaction, type ChatInputCommandInteraction,
  type ButtonInteraction, type ModalSubmitInteraction,
  ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ButtonBuilder, ButtonStyle,
} from 'discord.js';
import type { SlashCommand } from '../bot.js';
import {
  getTicketByChannel, getTicketById, claimTicket,
  logAction, isBlacklisted, saveRating,
  getCategoryById, getFormById,
} from '../database/queries.js';
import { openTicket, processTicketClose, buildAndSendTranscript } from '../services/ticket.js';
import { isStaff } from '../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../utils/embed.js';
import type { Form } from '../types/index.js';

function buildFormModal(form: Form, categoryId: string | null, directFormId?: string): ModalBuilder {
  const customId = `form_ticket_submit:${categoryId ?? 'null'}:${directFormId ?? 'null'}`;
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(form.name.slice(0, 45));

  const questions = (form.questions_json as any[]).slice(0, 5);
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
  if (!interaction.guild) return;

  if (action === 'panel_open') {
    const categoryId = rest[0] && rest[0] !== 'null' ? rest[0] : null;

    if (categoryId) {
      const category = await getCategoryById(categoryId);
      if (category?.form_id) {
        const form = await getFormById(category.form_id);
        if (form && (form.questions_json as any[]).length > 0) {
          await interaction.showModal(buildFormModal(form, categoryId));
          return;
        }
      }
    }

    await interaction.deferReply({ ephemeral: true });
    
    const member = interaction.guild.members.cache.get(interaction.user.id)
      ?? await interaction.guild.members.fetch(interaction.user.id);

    if (await isBlacklisted(interaction.guild.id, interaction.user.id)) {
      await interaction.editReply({ embeds: [errorEmbed('Blacklisted', 'You are not allowed to open tickets.')] });
      return;
    }

    try {
      const channel = await openTicket({ guild: interaction.guild, member, categoryId });
      await interaction.editReply({ embeds: [successEmbed('Ticket Created', `Your ticket: <#${channel.id}>`)] });
    } catch (err: any) {
      console.error('[Button:panel_open] Error:', err);
      await interaction.editReply({ embeds: [errorEmbed('Failed', err.message || 'Unknown error')] });
    }
    return;
  }

  if (action === 'ticket_claim') {
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.guild.members.cache.get(interaction.user.id)
      ?? await interaction.guild.members.fetch(interaction.user.id);
    
    if (!(await isStaff(member))) {
      await interaction.editReply({ embeds: [errorEmbed('No Permission', 'Only staff can claim tickets.')] });
      return;
    }

    const ticketId = rest[0];
    await claimTicket(ticketId, interaction.user.id);
    await logAction(ticketId, interaction.user.id, 'claimed');
    
    await interaction.editReply({ embeds: [successEmbed('Claimed', 'You have claimed this ticket.')] });
    if (interaction.channel && 'send' in interaction.channel) {
      await (interaction.channel as any).send({ embeds: [infoEmbed('Ticket Claimed', `<@${interaction.user.id}> has claimed this ticket.`)] });
    }
    return;
  }

  if (action === 'ticket_close') {
    const ticketId = rest[0];
    const modal = new ModalBuilder()
      .setCustomId(`close_modal:${ticketId}`)
      .setTitle('Close Ticket')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reason for closing')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(500)
        )
      );
    await interaction.showModal(modal);
    return;
  }
}

async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  const [action, ...rest] = interaction.customId.split(':');

  if (action === 'form_ticket_submit') {
    await interaction.deferReply({ ephemeral: true });
    const categoryId = rest[0] !== 'null' ? rest[0] : null;
    
    const member = interaction.guild.members.cache.get(interaction.user.id)
      ?? await interaction.guild.members.fetch(interaction.user.id);

    const formAnswers: Record<string, string> = {};
    for (const [fieldId, component] of interaction.fields.fields) {
      formAnswers[fieldId] = component.value;
    }

    try {
      const channel = await openTicket({
        guild: interaction.guild!,
        member,
        categoryId,
        formAnswers,
      });
      await interaction.editReply({ embeds: [successEmbed('Ticket Created', `Your ticket: <#${channel.id}>`)] });
    } catch (err: any) {
      console.error('[Modal:form_ticket_submit] Error:', err);
      await interaction.editReply({ embeds: [errorEmbed('Failed', err.message || 'Unknown error')] });
    }
    return;
  }

  if (action === 'close_modal') {
    await interaction.deferReply({ ephemeral: true });
    const ticketId = rest[0];
    const reason = interaction.fields.getTextInputValue('reason') || undefined;

    if (!interaction.guild || !interaction.channel) return;

    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Ticket not found.')] });
      return;
    }

    await interaction.editReply({ embeds: [infoEmbed('Closing...', 'Processing transcript...')] });
    await processTicketClose(ticket, interaction.user.id, reason);
    await buildAndSendTranscript(ticket, interaction.channel as any);
    
    await (interaction.channel as any).send({
      embeds: [infoEmbed('Ticket Closed', `Closed by <@${interaction.user.id}>${reason ? ` — ${reason}` : '.'}`)],
    });
    
    // Lock channel
    const textChannel = interaction.channel as any;
    await textChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
    await textChannel.permissionOverwrites.edit(ticket.opener_id, { ViewChannel: true, SendMessages: false });
    
    await interaction.editReply({ embeds: [successEmbed('Closed', 'Ticket has been closed.')] });
  }
}
