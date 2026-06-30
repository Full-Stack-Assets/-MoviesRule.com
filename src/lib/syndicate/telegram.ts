import type { AdapterResult } from './types';

/**
 * Broadcast a new post to a Telegram channel — a strong fit for a movies
 * audience (movie-news channels are huge there). Skips unless TELEGRAM_BOT_TOKEN
 * (from @BotFather) and TELEGRAM_CHAT_ID (the channel @username or numeric
 * -100… id, with the bot added as a channel admin) are both set.
 *
 * Uses the plain Bot API sendMessage; the link in `text` renders a preview card.
 */
export async function postToTelegram(text: string): Promise<AdapterResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return { skipped: true };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);

  // Build a t.me permalink when the channel is a public @username and the API
  // returns the message id; otherwise just report success without a URL.
  const data = (await res.json()) as { result?: { message_id?: number } };
  const messageId = data.result?.message_id;
  if (messageId && chatId.startsWith('@')) {
    return { url: `https://t.me/${chatId.slice(1)}/${messageId}` };
  }
  return {};
}
