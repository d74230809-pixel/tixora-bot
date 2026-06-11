import {
  type Interaction, type ChatInputCommandInteraction,
  type ButtonInteraction, type ModalSubmitInteraction,
  ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  ButtonBuilder, ButtonStyle,
} from 'discord.js';
import type { SlashCommand } from '../bot.js';
import { openTicket } from '../services/ticket.js';
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
  const [action] = interaction.customId.split(':');
  if (!interaction.guild) return;

  if (action === 'panel_open' || action === 'open_ticket') {
    await interaction.deferReply({ ephemeral: true });
    const member = await interaction.guild.members.fetch(interaction.user.id);
    try {
      const channel = await openTicket({ guild: interaction.guild, member });
      await interaction.editReply({ embeds: [successEmbed('Ticket Created', `Your ticket: <#${channel.id}>`)] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [errorEmbed('Failed', err.message || 'Unknown error')] });
    }
  }

  if (action === 'ticket_claim') {
    await interaction.reply({ embeds: [infoEmbed('Ticket Claimed', `<@${interaction.user.id}> has claimed this ticket.`)] });
  }

  if (action === 'ticket_close') {
    await interaction.reply({ embeds: [infoEmbed('Closing...', 'This ticket is being closed.')] });
    const textChannel = interaction.channel as any;
    await textChannel.send({ embeds: [infoEmbed('Ticket Closed', `Closed by <@${interaction.user.id}>. This channel will be deleted in 10 seconds.`)] });
    setTimeout(() => textChannel.delete().catch(() => {}), 10000);
  }

  if (action === 'ticket_tools') {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ticket_delete:none`).setLabel('Delete Channel').setStyle(ButtonStyle.Danger),
    );
    await interaction.reply({ content: '🛠️ **Staff Tools**', components: [row], ephemeral: true });
  }

  if (action === 'ticket_delete') {
    await interaction.reply({ content: '⚠️ Deleting channel now...' });
    setTimeout(() => interaction.channel?.delete().catch(() => {}), 1000);
  }
}

async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  // Modal support disabled in No-DB mode for maximum simplicity
  await interaction.reply({ content: 'Modals are currently disabled in No-DB mode.', ephemeral: true });
}
