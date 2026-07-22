export type WorkoutSet = {
  weight: string | number | null;
  reps: string | number | null;
  done: boolean;
};

export type Workout = {
  id: number;
  name: string;
  date: string;
  duration: number | null;
  exercises: Array<{
    exercise_name: string;
    sets: WorkoutSet[];
  }>;
};

export type Plan = {
  id: number;
  name: string;
  description: string | null;
  exercises: Array<{
    exercise_name: string;
    rest_seconds: number | null;
  }>;
};

export type BootstrapData = {
  profile: {
    email?: string;
    name?: string | null;
    age?: number | null;
    height?: string | number | null;
    goal?: string | null;
    joined_at?: string | null;
  };
  workouts: Workout[];
  plans: Plan[];
  weekPlan: Record<string, number | null>;
  prs: Record<string, { weight: string | number | null; reps: number | null; date: string | null }>;
  weight: Array<{ id: number; weight: string | number; date: string; note: string | null }>;
  supplements: Array<{
    id: string;
    name: string;
    dose: string | null;
    time: string | null;
    enabled: boolean;
    taken_dates: string[];
  }>;
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function getBootstrapData(): Promise<BootstrapData> {
  const response = await fetch('/api/init', { credentials: 'same-origin' });
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  return response.json() as Promise<BootstrapData>;
}
