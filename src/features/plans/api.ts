import type { Plan } from '../../lib/api';

export class PlansApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request(path: string, method: 'POST' | 'PUT', body: unknown): Promise<void> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new PlansApiError(response.status, payload?.error ?? 'Unable to save plan.');
  }
}

export async function createPlan(input: { name: string; description: string; exercises: string[] }): Promise<void> {
  await request('/api/plans', 'POST', {
    name: input.name,
    description: input.description || null,
    exercises: input.exercises.map(name => ({ name, restSeconds: 90 })),
  });
}

export async function saveWeekPlan(weekPlan: Record<string, number | null>): Promise<void> {
  await request('/api/week-plan', 'PUT', weekPlan);
}

export function planExerciseNames(plan: Plan): string[] {
  return plan.exercises.map(exercise => exercise.exercise_name);
}
