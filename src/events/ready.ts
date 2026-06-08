import type { Client } from 'discord.js';
import { startAutoCloseJob } from '../jobs/autoClose.js';

export default async function onReady(client: Client): Promise<void> {
  console.log(`[Tixora] Logged in as ${client.user?.tag}`);
  client.user?.setActivity('Support tickets | /help', { type: 3 });
  startAutoCloseJob(client);
}
