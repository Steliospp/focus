/**
 * Transcription service – currently returns a placeholder.
 * Swap in the real Whisper API call below when ready.
 */

export async function transcribeAudio(filePath: string): Promise<string> {
  const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

  if (!OPENAI_API_KEY) {
    console.warn('[transcription] No API key set – returning placeholder');
    return '(transcription pending – recording saved locally)';
  }

  const formData = new FormData();
  formData.append('file', {
    uri: filePath,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${response.status} – ${error}`);
  }

  const result = await response.json();
  return result.text as string;
}
