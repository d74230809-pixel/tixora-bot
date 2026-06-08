import 'dotenv/config';
import { client, loadCommands, registerListeners } from './bot.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN is not set');
  process.exit(1);
}

async function main(): Promise<void> {
  await loadCommands();
  registerListeners();
  await client.login(token);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
