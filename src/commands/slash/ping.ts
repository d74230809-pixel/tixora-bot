import { SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import { infoEmbed } from '../../utils/embed.js';

export default {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check if Tixora is online'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply({
      embeds: [infoEmbed('Pong!', `Bot latency: **${latency}ms** | WS: **${interaction.client.ws.ping}ms**`)],
      ephemeral: true,
    });
  },

  async prefixExecute(message: Message): Promise<void> {
    const latency = Date.now() - message.createdTimestamp;
    await message.reply({ embeds: [infoEmbed('Pong!', `Bot latency: **${latency}ms**`)] });
  },
};
