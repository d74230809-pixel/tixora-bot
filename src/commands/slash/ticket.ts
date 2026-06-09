import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { getTicketByChannel } from '../../database/queries.js';
import { errorEmbed, TIXORA_COLOR } from '../../utils/embed.js';
import { db } from '../../database/client.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Show details about the current ticket'),

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

    // Fetch extra data
    const [actionsRes, membersRes, notesRes] = await Promise.all([
      db.from('ticket_actions').select('action_type, actor_id, created_at').eq('ticket_id', ticket.id).order('created_at', { ascending: false }).limit(5),
      db.from('ticket_members').select('user_id').eq('ticket_id', ticket.id),
      db.from('internal_notes').select('content, author_id, created_at').eq('ticket_id', ticket.id).order('created_at', { ascending: false }).limit(3),
    ]);

    const actions = actionsRes.data ?? [];
    const members = membersRes.data ?? [];
    const notes = notesRes.data ?? [];

    const age = Math.floor((Date.now() - new Date(ticket.opened_at).getTime()) / 60000);
    const ageStr = age < 60 ? `${age}m` : age < 1440 ? `${Math.floor(age / 60)}h ${age % 60}m` : `${Math.floor(age / 1440)}d`;

    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setTitle('Ticket Details')
      .addFields(
        { name: 'Ticket ID', value: `\`${ticket.id.slice(0, 8)}…\``, inline: true },
        { name: 'Status', value: ticket.status === 'open' ? '🟢 Open' : '🔴 Closed', inline: true },
        { name: 'Age', value: ageStr, inline: true },
        { name: 'Opened by', value: `<@${ticket.opener_id}>`, inline: true },
        { name: 'Claimed by', value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'Unclaimed', inline: true },
        { name: 'Tags', value: ticket.tags_json?.length ? ticket.tags_json.map((t: string) => `\`${t}\``).join(', ') : 'None', inline: true },
      )
      .setFooter({ text: 'Tixora' })
      .setTimestamp();

    if (members.length) {
      embed.addFields({ name: 'Added Members', value: members.map((m: { user_id: string }) => `<@${m.user_id}>`).join(', '), inline: false });
    }

    if (actions.length) {
      const actionLines = actions.map((a: { action_type: string; actor_id: string; created_at: string }) =>
        `\`${a.action_type}\` by <@${a.actor_id}> — <t:${Math.floor(new Date(a.created_at).getTime() / 1000)}:R>`,
      ).join('\n');
      embed.addFields({ name: 'Recent Actions', value: actionLines });
    }

    if (notes.length) {
      const noteLines = notes.map((n: { content: string; author_id: string }) =>
        `**[Note by <@${n.author_id}>]:** ${n.content.slice(0, 100)}`,
      ).join('\n');
      embed.addFields({ name: 'Staff Notes', value: noteLines });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async prefixExecute(message: Message): Promise<void> {
    if (!message.guild) return;
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) {
      await message.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not an active ticket channel.')] });
      return;
    }

    const age = Math.floor((Date.now() - new Date(ticket.opened_at).getTime()) / 60000);
    const ageStr = age < 60 ? `${age}m` : age < 1440 ? `${Math.floor(age / 60)}h ${age % 60}m` : `${Math.floor(age / 1440)}d`;

    const embed = new EmbedBuilder()
      .setColor(TIXORA_COLOR)
      .setTitle('Ticket Details')
      .addFields(
        { name: 'Status', value: ticket.status === 'open' ? '🟢 Open' : '🔴 Closed', inline: true },
        { name: 'Age', value: ageStr, inline: true },
        { name: 'Opened by', value: `<@${ticket.opener_id}>`, inline: true },
        { name: 'Claimed', value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'No', inline: true },
        { name: 'Tags', value: ticket.tags_json?.length ? ticket.tags_json.join(', ') : 'None', inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
