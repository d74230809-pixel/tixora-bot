import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency (No-DB Mode)'),
  async execute(interaction: ChatInputCommandInteraction) {
    const start = Date.now();
    await interaction.deferReply();
    const botLatency = Date.now() - start;
    const apiLatency = Math.round(interaction.client.ws.ping);

    let dbStatus = '🟢 Connected';
    try {
      const { query } = await import('../../database/client.js');
      await query('SELECT 1');
    } catch (err: any) {
      dbStatus = `🔴 Error: ${err.message.includes('ENOTFOUND') ? 'Host Not Found' : 'Connection Failed'}`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(dbStatus.startsWith('🟢') ? 0x00FF00 : 0xFF4444)
      .addFields(
        { name: '🤖 Bot Latency', value: `${botLatency}ms`, inline: true },
        { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true },
        { name: '🗄️ Database', value: dbStatus, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Tixora Support • System Status' });
    await interaction.editReply({ embeds: [embed] });
  },
  async prefixExecute(message: Message) {
    const start = Date.now();
    const apiLatency = Math.round(message.client.ws.ping);

    let dbStatus = '🟢 Connected';
    try {
      const { query } = await import('../../database/client.js');
      await query('SELECT 1');
    } catch (err: any) {
      dbStatus = `🔴 Error: ${err.message.includes('ENOTFOUND') ? 'Host Not Found' : 'Connection Failed'}`;
    }

    const botLatency = Date.now() - start;
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(dbStatus.startsWith('🟢') ? 0x00FF00 : 0xFF4444)
      .addFields(
        { name: '🤖 Bot Latency', value: `${botLatency}ms`, inline: true },
        { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true },
        { name: '🗄️ Database', value: dbStatus, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Tixora Support • System Status' });
    await message.reply({ embeds: [embed] });
  }
};
