import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { query } from '../database/client.js';

export default {
  data: new SlashCommandBuilder()
    .setName('canned')
    .setDescription('Manage canned responses')
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all canned responses')
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a canned response')
        .addStringOption(opt => opt.setName('name').setDescription('Name of the response').setRequired(true))
        .addStringOption(opt => opt.setName('content').setDescription('Content of the response').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a canned response')
        .addStringOption(opt => opt.setName('name').setDescription('Name of the response').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (subcommand === 'list') {
      const { rows } = await query('SELECT * FROM canned_responses WHERE guild_id = $1', [guildId]);
      
      if (rows.length === 0) {
        return interaction.reply({ content: 'No canned responses found.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('Canned Responses')
        .setDescription(rows.map((r: any) => `**${r.name}**: ${r.content.substring(0, 50)}...`).join('\n'))
        .setColor('#5865F2');

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'add') {
      const name = interaction.options.getString('name')!;
      const content = interaction.options.getString('content')!;

      await query(
        'INSERT INTO canned_responses (guild_id, name, content) VALUES ($1, $2, $3) ON CONFLICT (guild_id, name) DO UPDATE SET content = EXCLUDED.content',
        [guildId, name, content]
      );

      return interaction.reply({ content: `Added canned response: **${name}**`, ephemeral: true });
    }

    if (subcommand === 'delete') {
      const name = interaction.options.getString('name')!;

      await query('DELETE FROM canned_responses WHERE guild_id = $1 AND name = $2', [guildId, name]);

      return interaction.reply({ content: `Deleted canned response: **${name}**`, ephemeral: true });
    }
  }
};
