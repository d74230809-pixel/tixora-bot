import type { TextChannel, Message, Collection, Snowflake } from 'discord.js';
import type { TranscriptMessage } from '../types/index.js';

export async function fetchAllMessages(channel: TextChannel): Promise<TranscriptMessage[]> {
  const allMessages: Message[] = [];
  let lastId: string | undefined;

  while (true) {
    const options: { limit: number; before?: string } = { limit: 100 };
    if (lastId) options.before = lastId;

    const fetched: Collection<Snowflake, Message> = await channel.messages.fetch(options);
    if (fetched.size === 0) break;

    allMessages.push(...fetched.values());
    lastId = fetched.last()?.id;

    if (fetched.size < 100) break;
  }

  return allMessages
    .reverse()
    .filter(m => !m.author.bot || m.embeds.length === 0)
    .map(m => ({
      author_id: m.author.id,
      author_name: m.author.username,
      author_avatar: m.author.displayAvatarURL() ?? null,
      content: m.content || (m.embeds.length > 0 ? '[embed]' : '[attachment]'),
      attachments: m.attachments.map(a => a.url),
      timestamp: m.createdAt.toISOString(),
    }));
}
