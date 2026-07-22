export type WorkoutSaveInput = {
  name: string;
  date: string;
  duration: number;
  exercises: Array<{
    name: string;
    restSeconds: number;
    sets: Array<{ weight: number; reps: number; done: boolean }>;
  }>;
};

export class WorkoutApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function saveWorkout(workout: WorkoutSaveInput): Promise<void> {
  const response = await fetch('/api/workouts', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...workout,
      muscles: [],
      exercises: workout.exercises.map(exercise => ({
        ...exercise,
        sets: exercise.sets.map(set => ({
          weight: String(set.weight),
          reps: String(set.reps),
          done: set.done,
        })),
      })),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new WorkoutApiError(response.status, payload?.error ?? 'Unable to save workout.');
  }
}
