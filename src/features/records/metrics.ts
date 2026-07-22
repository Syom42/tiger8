import type { BootstrapData, Workout } from '../../lib/api';

export type RecordSummary = {
  exercise: string;
  weight: number;
  reps: number | null;
  date: string | null;
  progression: Array<{ date: string; weight: number }>;
};

function highestCompletedWeight(workouts: Workout[], exerciseName: string) {
  const points = workouts.flatMap(workout => {
    const weight = Math.max(
      0,
      ...workout.exercises
        .filter(exercise => exercise.exercise_name === exerciseName)
        .flatMap(exercise => exercise.sets)
        .filter(set => set.done)
        .map(set => Number(set.weight))
        .filter(Number.isFinite),
    );

    return weight > 0 ? [{ date: workout.date, weight }] : [];
  });

  return points.sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
}

export function recordsFromBootstrap(data: BootstrapData | null): RecordSummary[] {
  if (!data) return [];

  return Object.entries(data.prs)
    .map(([exercise, record]) => {
      const weight = Number(record.weight);
      if (!Number.isFinite(weight) || weight <= 0) return null;
      return {
        exercise,
        weight,
        reps: record.reps,
        date: record.date,
        progression: highestCompletedWeight(data.workouts, exercise),
      };
    })
    .filter((record): record is RecordSummary => record !== null)
    .sort((first, second) => second.weight - first.weight);
}

export function formatRecordDate(value: string | null): string {
  if (!value) return 'ללא תאריך';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}
