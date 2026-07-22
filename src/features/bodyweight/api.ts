export class BodyWeightApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function saveBodyWeight(weight: number): Promise<void> {
  const response = await fetch('/api/weight', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weight,
      date: new Date().toISOString().slice(0, 10),
      note: null,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new BodyWeightApiError(response.status, payload?.error ?? 'Unable to save body weight.');
  }
}
