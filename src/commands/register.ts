import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { allCommands } from './all.js';

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
  process.exit(1);
}

const commands = allCommands.map(c => c.data.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

async function register() {
  try {
    console.log(`Registering ${commands.length} slash commands globally...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

register();
