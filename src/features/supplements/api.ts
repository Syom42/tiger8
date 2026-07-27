export class SupplementApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function createSupplement(input: { name: string; dose: string; time: string }): Promise<void> {
  const response = await fetch('/api/supplements', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      dose: input.dose || null,
      time: input.time || null,
      enabled: true,
    }),
  });

  if (!response.ok) {
    throw new SupplementApiError(response.status, 'Unable to create supplement.');
  }
}

export async function setSupplementTaken(id: string, taken: boolean): Promise<void> {
  const response = await fetch('/api/supplements', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, taken, date: new Date().toISOString().slice(0, 10) }),
  });

  if (!response.ok) {
    throw new SupplementApiError(response.status, 'Unable to update supplement adherence.');
  }
}

export async function setSupplementEnabled(
  supplement: { id: string; name: string; dose: string | null; time: string | null },
  enabled: boolean,
): Promise<void> {
  const response = await fetch('/api/supplements', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...supplement, enabled }),
  });

  if (!response.ok) {
    throw new SupplementApiError(response.status, 'Unable to update supplement.');
  }
}
