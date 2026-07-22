export type CoachMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export class CoachApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function sendCoachMessage(messages: CoachMessage[]): Promise<string> {
  const response = await fetch('/api/coach', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, temperature: 0.7, max_tokens: 512 }),
  });

  const payload = await response.json().catch(() => null) as {
    error?: string;
    choices?: Array<{ message?: { content?: string } }>;
  } | null;

  if (!response.ok) {
    throw new CoachApiError(response.status, payload?.error ?? 'Unable to reach the AI coach.');
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new CoachApiError(502, 'The AI coach returned an empty response.');
  }

  return content;
}
