export type ProfileInput = {
  name: string | null;
  age: number | null;
  height: number | null;
  goal: string | null;
};

export class ProfileApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function saveProfile(profile: ProfileInput): Promise<void> {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new ProfileApiError(response.status, 'Unable to save profile.');
  }
}
