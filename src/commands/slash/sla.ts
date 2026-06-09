import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { db } from '../../database/client.js';
import { getTicketByChannel } from '../../database/queries.js';
import { errorEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sla')
    .setDescription('Check SLA status for the current ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      await interaction.reply({ embeds: [errorEmbed('Not a Ticket', 'Use inside a ticket channel.')], ephemeral: true });
      return;
    }
    const { data: config } = await db.from('sla_config').select().eq('guild_id', interaction.guildId!).single();
    const respMins = config?.response_sla_minutes ?? 60;
    const resMins = (config?.resolution_sla_hours ?? 24) * 60;
    const elapsed = (Date.now() - new Date(ticket.opened_at).getTime()) / 60000;
    const respBreached = elapsed > respMins;
    const resBreached = elapsed > resMins;

    const elapsedH = Math.floor(elapsed / 60);
    const elapsedM = Math.floor(elapsed % 60);
    const elapsedStr = elapsedH > 0 ? `${elapsedH}h ${elapsedM}m` : `${elapsedM}m`;

    const embed = new EmbedBuilder()
      .setTitle('SLA Status')
      .setColor(resBreached ? 0xff4444 : respBreached ? 0xffaa00 : 0x00cc66)
      .setDescription(resBreached ? 'Resolution SLA breached — this ticket needs urgent attention.' : respBreached ? 'Response SLA breached.' : 'All SLA targets are on track.')
      .addFields(
        { name: 'Ticket Age', value: elapsedStr, inline: true },
        { name: 'Response SLA', value: respBreached ? `Breached (limit: ${respMins}m)` : `On track (limit: ${respMins}m)`, inline: true },
        { name: 'Resolution SLA', value: resBreached ? `Breached (limit: ${resMins / 60}h)` : `On track (limit: ${resMins / 60}h)`, inline: true },
      )
      .setFooter({ text: !config ? 'Default SLA values — configure in dashboard' : 'SLA configured via dashboard' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async prefixExecute(message: Message): Promise<void> {
    if (!message.guild) return;
    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket) { await message.reply({ embeds: [errorEmbed('Not a Ticket', 'Use inside a ticket channel.')] }); return; }
    const { data: config } = await db.from('sla_config').select().eq('guild_id', message.guildId!).single();
    const respMins = config?.response_sla_minutes ?? 60;
    const elapsed = (Date.now() - new Date(ticket.opened_at).getTime()) / 60000;
    const respBreached = elapsed > respMins;
    const embed = new EmbedBuilder()
      .setTitle('SLA Status')
      .setColor(respBreached ? 0xffaa00 : 0x00cc66)
      .addFields(
        { name: 'Age', value: `${Math.floor(elapsed / 60)}h ${Math.floor(elapsed % 60)}m`, inline: true },
        { name: 'Response SLA', value: respBreached ? 'Breached' : 'On track', inline: true },
      ).setTimestamp();
    await message.reply({ embeds: [embed] });
  },
};
