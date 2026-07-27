import type { Plan } from '../../lib/api';

export class PlansApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export type PlanExerciseInput = { name: string; supersetGroup: string | null; restSeconds: number };

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

export async function createPlan(input: { name: string; description: string; exercises: PlanExerciseInput[] }): Promise<void> {
  await savePlan(input);
}

export async function savePlan(input: { id?: number; name: string; description: string; exercises: PlanExerciseInput[] }): Promise<void> {
  await request('/api/plans', 'POST', {
    id: input.id,
    name: input.name,
    description: input.description || null,
    exercises: input.exercises,
  });
}

export async function saveWeekPlan(weekPlan: Record<string, number | null>): Promise<void> {
  await request('/api/week-plan', 'PUT', weekPlan);
}

export function planExerciseNames(plan: Plan): string[] {
  return plan.exercises.map(exercise => exercise.exercise_name);
}
