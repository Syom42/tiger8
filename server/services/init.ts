// Combined bootstrap payload — returns all user data in a single request.
// Eliminates 8 parallel cold-start connections to Neon.
import { listExercises, type ExerciseDto } from './exercises.js';
import { getPersonalRecords, type PersonalRecordMap } from './prs.js';
import { getProfile, type ProfileDto } from './profile.js';
import { listPlans, type PlanDto } from './plans.js';
import { listSupplements, type SupplementDto } from './supplements.js';
import { EMPTY_WEEK_PLAN, getWeekPlan, type WeekPlanDto } from './weekPlan.js';
import { listWeight, type WeightEntryDto } from './weight.js';
import { listWorkouts, type WorkoutDto } from './workouts.js';

export interface BootstrapPayload {
  profile: ProfileDto;
  exercises: ExerciseDto[];
  workouts: WorkoutDto[];
  plans: PlanDto[];
  weekPlan: WeekPlanDto;
  prs: PersonalRecordMap;
  weight: WeightEntryDto[];
  supplements: SupplementDto[];
}

/** Isolates each query so one failure doesn't take down the whole payload. */
async function safe<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[init] ${label} failed:`, error instanceof Error ? error.message : error);
    return fallback;
  }
}

export async function loadBootstrap(uid: number, fallbackEmail: string): Promise<BootstrapPayload> {
  const [profile, exercises, workouts, plans, weekPlan, prs, weight, supplements] = await Promise.all([
    safe('profile', () => getProfile(uid, fallbackEmail), { email: fallbackEmail } as ProfileDto),
    safe<ExerciseDto[]>('exercises', () => listExercises(uid), []),
    safe<WorkoutDto[]>('workouts', () => listWorkouts(uid), []),
    safe<PlanDto[]>('plans', () => listPlans(uid), []),
    safe('weekPlan', () => getWeekPlan(uid), EMPTY_WEEK_PLAN),
    safe<PersonalRecordMap>('prs', () => getPersonalRecords(uid), {}),
    safe<WeightEntryDto[]>('weight', () => listWeight(uid), []),
    safe<SupplementDto[]>('supplements', () => listSupplements(uid), []),
  ]);

  console.log(`[init] uid=${uid} plans=${plans.length} workouts=${workouts.length}`);

  return { profile, exercises, workouts, plans, weekPlan, prs, weight, supplements };
}
