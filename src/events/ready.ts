import { type Client, REST, Routes } from 'discord.js';
  import { startAutoCloseJob } from '../jobs/autoClose.js';
  import { getCommands } from '../bot.js';

  export default async function onReady(client: Client): Promise<void> {
    console.log(`[Tixora] Logged in as ${client.user?.tag}`);
    client.user?.setActivity('Support tickets | /help', { type: 3 });

    try {
      const token = process.env.DISCORD_TOKEN;
      const clientId = process.env.DISCORD_CLIENT_ID;
      if (token && clientId) {
        const rest = new REST({ version: '10' }).setToken(token);
        const body = [...getCommands().values()].map(c => c.data.toJSON());
        await rest.put(Routes.applicationCommands(clientId), { body });
        console.log(`[Tixora] Registered ${body.length} slash commands globally`);
      }
    } catch (err) {
      console.error('[Tixora] Failed to register slash commands:', err);
    }

    startAutoCloseJob(client);
  }
  