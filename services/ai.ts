/**
 * AI summary service – currently returns a placeholder.
 * Swap in the real Claude API call below when ready.
 */

export async function generateSummary(transcript: string): Promise<string> {
  // ── Placeholder ────────────────────────────────────────────────────────
  console.log('[ai] stub called, transcript length:', transcript.length);
  return '';

  // ── Claude API (uncomment to wire up) ─────────────────────────────────
  // const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? '';
  //
  // const response = await fetch('https://api.anthropic.com/v1/messages', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-api-key': CLAUDE_API_KEY,
  //     'anthropic-version': '2023-06-01',
  //   },
  //   body: JSON.stringify({
  //     model: 'claude-sonnet-4-20250514',
  //     max_tokens: 256,
  //     messages: [
  //       {
  //         role: 'user',
  //         content: `You are a gentle, concise journaling assistant. Summarise the following voice journal entry in 1-2 short sentences. Focus on the emotional tone and any key themes. Do not add advice.\n\nTranscript:\n${transcript}`,
  //       },
  //     ],
  //   }),
  // });
  //
  // if (!response.ok) {
  //   const error = await response.text();
  //   throw new Error(`Claude API error: ${response.status} – ${error}`);
  // }
  //
  // const result = await response.json();
  // const block = result.content?.[0];
  // return block?.type === 'text' ? block.text : '';
}
