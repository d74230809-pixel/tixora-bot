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
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(botLatency < 200 ? 0x00FF00 : 0xFFFF00)
      .addFields(
        { name: '🤖 Bot Latency', value: `${botLatency}ms`, inline: true },
        { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true },
        { name: '🗄️ Database', value: 'Disabled (Instant Mode)', inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Tixora Support • No-DB Mode' });
    await interaction.editReply({ embeds: [embed] });
  },
  async prefixExecute(message: Message) {
    const start = Date.now();
    const botLatency = Date.now() - start;
    const apiLatency = Math.round(message.client.ws.ping);
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(botLatency < 200 ? 0x00FF00 : 0xFFFF00)
      .addFields(
        { name: '🤖 Bot Latency', value: `${botLatency}ms`, inline: true },
        { name: '🌐 API Latency', value: `${apiLatency}ms`, inline: true },
        { name: '🗄️ Database', value: 'Disabled (Instant Mode)', inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Tixora Support • No-DB Mode' });
    await message.reply({ embeds: [embed] });
  }
};
