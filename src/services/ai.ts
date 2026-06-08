import type { TranscriptMessage } from '../types/index.js';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.1-8b-instruct';

export async function generateTicketSummary(messages: TranscriptMessage[], category?: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return 'AI summary unavailable — NVIDIA_API_KEY not configured.';
  }

  const transcript = messages
    .slice(-80)
    .map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.author_name}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are a Discord support ticket summarizer. Analyze ticket transcripts and produce concise, structured summaries. Be factual and specific.`;

  const userPrompt = `Summarize this Discord support ticket${category ? ` (category: ${category})` : ''} in 3-5 sentences. Cover: the issue reported, actions taken by staff, and resolution status. Be concise.\n\n---\n${transcript}\n---`;

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      console.error('NVIDIA API error:', response.status, await response.text());
      return 'AI summary could not be generated at this time.';
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? 'No summary generated.';
  } catch (err) {
    console.error('AI summary error:', err);
    return 'AI summary could not be generated at this time.';
  }
}
