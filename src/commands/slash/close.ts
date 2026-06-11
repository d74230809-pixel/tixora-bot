import {
  SlashCommandBuilder, type ChatInputCommandInteraction, type Message,
  ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
} from 'discord.js';
import { getTicketByChannel } from '../../database/queries.js';
import { isStaff } from '../../utils/permissions.js';
import { errorEmbed, infoEmbed } from '../../utils/embed.js';
import { processTicketClose, buildAndSendTranscript } from '../../services/ticket.js';

export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket')
    .addStringOption(o => o.setName('reason').setDescription('Reason for closing').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Run this in a ticket channel.')], ephemeral: true });
      return;
    }
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      await interaction.reply({ embeds: [errorEmbed('Not a Ticket', 'This channel is not an active ticket.')], ephemeral: true });
      return;
    }
    const member = interaction.guild.members.cache.get(interaction.user.id)
      ?? await interaction.guild.members.fetch(interaction.user.id);
    const staff = await isStaff(member);
    if (!staff && ticket.opener_id !== interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed('No Permission', 'Only staff or the opener can close this ticket.')], ephemeral: true });
      return;
    }
    const reason = interaction.options.getString('reason') ?? undefined;
    if (!reason) {
      const modal = new ModalBuilder()
        .setCustomId(`close_modal:${ticket.id}`)
        .setTitle('Close Ticket')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('reason')
              .setLabel('Reason (optional)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(200),
          ),
        );
      await interaction.showModal(modal);
      return;
    }
    // Defer immediately to avoid timeout
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await processTicketClose(ticket, interaction.user.id, reason);
      
      // Send the transcript in the background so the user doesn't wait
      buildAndSendTranscript(ticket, interaction.channel as import('discord.js').TextChannel).catch(err => {
        console.error('[Close] Transcript error:', err);
      });

      await interaction.editReply({ 
        embeds: [infoEmbed('Ticket Closed', 'The ticket has been closed. Transcript is being generated.')] 
      });
    } catch (err) {
      console.error('[Close] Error:', err);
      await interaction.editReply({ embeds: [errorEmbed('Error', 'Failed to close ticket.')] });
    }
  },

  async prefixExecute(message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) { await message.reply({ embeds: [errorEmbed('Not a Ticket', 'Not an active ticket channel.')] }); return; }
    const member = message.guild.members.cache.get(message.author.id) ?? await message.guild.members.fetch(message.author.id);
    const staff = await isStaff(member);
    if (!staff && ticket.opener_id !== message.author.id) { await message.reply({ embeds: [errorEmbed('No Permission', 'Staff or opener only.')] }); return; }
    const reason = args.join(' ') || undefined;
    await processTicketClose(ticket, message.author.id, reason);
    await buildAndSendTranscript(ticket, message.channel as import('discord.js').TextChannel);
    await message.reply({ embeds: [infoEmbed('Ticket Closed', 'Transcript saved.')] });
  },
};
