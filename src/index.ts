import 'dotenv/config';
import { client, loadCommands, registerListeners } from './bot.js';
import { postCrashAlert } from './events/ready.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is not set');
  process.exit(1);
}

process.on('uncaughtException', async (err) => {
  console.error('[Tixora] Uncaught exception:', err);
  await postCrashAlert(err);
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  console.error('[Tixora] Unhandled rejection:', err);
  await postCrashAlert(err);
});

async function main(): Promise<void> {
  await loadCommands();
  registerListeners();
  await client.login(token);
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await postCrashAlert(err instanceof Error ? err : new Error(String(err)));
  process.exit(1);
});
