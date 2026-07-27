export type Screen =
  | "dashboard" | "plans" | "workout" | "history"
  | "records" | "bodyweight" | "supplements" | "profile" | "ai";

export type WorkoutSet = {
  weight: number;
  reps: number;
  done: boolean;
  rpe: number | null;
  rir: number | null;
  isWarmup: boolean;
};

export type WorkoutExercise = {
  id: number; name: string; sets: WorkoutSet[];
  lastSession: string; progressionHint: string | null; pr: number; restSeconds: number;
  supersetGroup: string | null;
};

export type WorkoutDraft = {
  planId: number;
  exercises: WorkoutExercise[];
  elapsed: number;
  restTimer: number | null;
};
