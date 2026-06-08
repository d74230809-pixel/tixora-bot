import {
  Client, GatewayIntentBits, Partials,
  type ChatInputCommandInteraction, type Message,
} from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import onReady from './events/ready.js';
import onInteraction from './events/interactionCreate.js';
import onMessage from './events/messageCreate.js';

export interface SlashCommand {
  data: { name: string; toJSON(): unknown };
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  prefixExecute?(message: Message, args: string[]): Promise<void>;
}

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const commands = new Map<string, SlashCommand>();

export async function loadCommands(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const slashDir = join(__dirname, 'commands', 'slash');

  try {
    const files = readdirSync(slashDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    for (const file of files) {
      const mod = await import(pathToFileURL(join(slashDir, file)).href);
      const command: SlashCommand = mod.default ?? mod;
      if (command?.data?.name) {
        commands.set(command.data.name, command);
        console.log(`[Commands] Loaded: ${command.data.name}`);
      }
    }
  } catch (err) {
    console.error('[Commands] Error loading commands:', err);
  }
}

export function registerListeners(): void {
  client.once('ready', () => onReady(client));

  client.on('interactionCreate', (interaction) =>
    onInteraction(interaction, commands),
  );

  client.on('messageCreate', (message) =>
    onMessage(message, client, commands),
  );
}

export function getCommands(): Map<string, SlashCommand> {
  return commands;
}
