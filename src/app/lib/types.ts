export type Screen =
  | "dashboard" | "plans" | "workout" | "history"
  | "records" | "bodyweight" | "supplements" | "profile" | "ai";

export type WorkoutSet = { weight: number; reps: number; done: boolean };

export type WorkoutExercise = {
  id: number; name: string; sets: WorkoutSet[];
  lastSession: string; pr: number; restSeconds: number;
};

export type WorkoutDraft = {
  planId: number;
  exercises: WorkoutExercise[];
  elapsed: number;
  restTimer: number | null;
};
