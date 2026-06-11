import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { query } from '../../database/client.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot and database latency'),
  async execute(interaction: ChatInputCommandInteraction) {
    const start = Date.now();
    await interaction.deferReply();
    const dbStart = Date.now();
    await query('SELECT 1');
    const dbLatency = Date.now() - dbStart;
    const botLatency = Date.now() - start;
    const apiLatency = Math.round(interaction.client.ws.ping);
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(dbLatency < 100 ? 0x00FF00 : dbLatency < 500 ? 0xFFFF00 : 0xFF0000)
      .addFields(
        { name: '🤖 Bot Latency', value: `${botLatency}ms`, inline: true },
        { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true },
        { name: '🗄️ DB Latency', value: `${dbLatency}ms`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Tixora Support • tixora.app' });
    await interaction.editReply({ embeds: [embed] });
  },
};
