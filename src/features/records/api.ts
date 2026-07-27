export class RecordsApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function correctPersonalRecord(input: { exercise: string; weight: number; reps: number; date: string }): Promise<void> {
  const response = await fetch('/api/prs', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      [input.exercise]: { weight: input.weight, reps: input.reps, date: input.date },
    }),
  });
  if (!response.ok) throw new RecordsApiError(response.status, 'Unable to update record.');
}