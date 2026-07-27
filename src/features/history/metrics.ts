import type { Workout } from '../../lib/api';

export type WorkoutSummary = {
  id: number;
  name: string;
  date: string;
  durationMinutes: number;
  setCount: number;
  volume: number;
};

function asPositiveNumber(value: string | number | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function summarizeWorkout(workout: Workout): WorkoutSummary {
  const completedSets = workout.exercises.flatMap(exercise =>
    exercise.sets.filter(set => set.done),
  );

  return {
    id: workout.id,
    name: workout.name,
    date: workout.date,
    durationMinutes: Math.round((workout.duration ?? 0) / 60),
    setCount: completedSets.length,
    volume: completedSets.reduce(
      (total, set) => total + asPositiveNumber(set.weight) * asPositiveNumber(set.reps),
      0,
    ),
  };
}

export function weeklyVolume(workouts: Workout[]): Array<{ week: string; volume: number }> {
  const weeks = new Map<string, number>();

  for (const workout of workouts) {
    const date = new Date(workout.date);
    if (Number.isNaN(date.getTime())) continue;

    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const key = weekStart.toISOString().slice(0, 10);
    weeks.set(key, (weeks.get(key) ?? 0) + summarizeWorkout(workout).volume);
  }

  return [...weeks.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .slice(-6)
    .map(([week, volume]) => ({
      week: new Date(`${week}T00:00:00`).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }),
      volume,
    }));
}

export function formatWorkoutDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (daysAgo === 0) return 'היום';
  if (daysAgo === 1) return 'אתמול';
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}
