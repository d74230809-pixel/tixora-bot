import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const slashDir = join(__dirname, 'slash');
const commands: unknown[] = [];

const files = readdirSync(slashDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
for (const file of files) {
  const mod = await import(pathToFileURL(join(slashDir, file)).href);
  const command = mod.default ?? mod;
  if (command?.data?.toJSON) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(token);

console.log(`Registering ${commands.length} slash commands globally...`);
await rest.put(Routes.applicationCommands(clientId), { body: commands });
console.log('✅ Slash commands registered successfully!');
