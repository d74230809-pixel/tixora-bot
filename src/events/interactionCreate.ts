import {
  type Interaction, type ChatInputCommandInteraction,
  type ButtonInteraction, type ModalSubmitInteraction,
  ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ButtonBuilder, ButtonStyle,
} from 'discord.js';
import type { SlashCommand } from '../bot.js';
import { openTicket, processTicketClose, buildAndSendTranscript } from '../services/ticket.js';
import { claimTicket, getTicketById, logAction, getTicketByChannel } from '../database/queries.js';
import { successEmbed, errorEmbed, infoEmbed } from '../utils/embed.js';

export default async function onInteraction(interaction: Interaction, commands: Map<string, SlashCommand>): Promise<void> {
  if (interaction.isChatInputCommand()) await handleSlash(interaction, commands);
  else if (interaction.isButton()) await handleButton(interaction);
  else if (interaction.isModalSubmit()) await handleModal(interaction);
}

async function handleSlash(interaction: ChatInputCommandInteraction, commands: Map<string, SlashCommand>): Promise<void> {
  const command = commands.get(interaction.commandName);
  if (!command) return;
  try { await command.execute(interaction); } catch (err) {
    console.error(`[Slash] Error in /${interaction.commandName}:`, err);
    const reply = { embeds: [errorEmbed('Command failed', 'An unexpected error occurred.')], ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
    else await interaction.reply(reply);
  }
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const [action, id] = interaction.customId.split(':');
  if (!interaction.guild) return;

  if (action === 'panel_open' || action === 'open_ticket') {
    await interaction.deferReply({ ephemeral: true });
    const member = await interaction.guild.members.fetch(interaction.user.id);
    try {
      const channel = await openTicket({ guild: interaction.guild, member, categoryId: id !== 'none' ? id : null });
      await interaction.editReply({ embeds: [successEmbed('Ticket Created', `Your ticket: <#${channel.id}>`)] });
    } catch (err: any) {
      console.error('[Ticket] Error opening ticket:', err);
      await interaction.editReply({ embeds: [errorEmbed('Failed', err.message || 'Unknown error')] });
    }
    return;
  }

  // For other actions, we need the ticket from DB
  const ticket = id && id !== 'none' ? await getTicketById(id) : await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    if (action.startsWith('ticket_')) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Ticket not found in database.')], ephemeral: true });
    }
    return;
  }

  if (action === 'ticket_claim') {
    await claimTicket(ticket.id, interaction.user.id);
    await logAction(ticket.id, interaction.user.id, 'ticket_claimed');
    await interaction.reply({ embeds: [infoEmbed('Ticket Claimed', `<@${interaction.user.id}> has claimed this ticket.`)] });
  }

  if (action === 'ticket_close') {
    await interaction.deferReply();
    try {
      await processTicketClose(ticket, interaction.user.id);
      await interaction.editReply({ embeds: [infoEmbed('Closing...', 'This ticket is being closed and archived.')] });
      
      // Async transcript and cleanup
      buildAndSendTranscript(ticket, interaction.channel as any).catch(console.error);
      
      setTimeout(() => interaction.channel?.delete().catch(() => {}), 5000);
    } catch (err: any) {
      await interaction.editReply({ embeds: [errorEmbed('Error', err.message)] });
    }
  }

  if (action === 'ticket_tools') {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ticket_delete:${ticket.id}`).setLabel('Delete Channel').setStyle(ButtonStyle.Danger),
    );
    await interaction.reply({ content: '🛠️ **Staff Tools**', components: [row], ephemeral: true });
  }

  if (action === 'ticket_delete') {
    await interaction.reply({ content: '⚠️ Deleting channel now...' });
    setTimeout(() => interaction.channel?.delete().catch(() => {}), 1000);
  }
}

async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  // Restore modal handling if needed, or keep simple for now
  await interaction.reply({ content: 'Modals are being re-enabled.', ephemeral: true });
}
