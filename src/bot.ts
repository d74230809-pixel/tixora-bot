import {
  Client, GatewayIntentBits, Partials,
  type ChatInputCommandInteraction, type Message,
} from 'discord.js';
import onReady from './events/ready.js';
import onInteraction from './events/interactionCreate.js';
import onMessage from './events/messageCreate.js';
import { allCommands } from './commands/all.js';

export interface SlashCommand {
  data: { name: string; toJSON(): any };
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
  for (const command of allCommands) {
    if (command?.data?.name) {
      commands.set(command.data.name, command);
      console.log(`[Commands] Loaded: ${command.data.name}`);
    }
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
