// All request-body schemas in one place.
import { z } from 'zod';

const nonEmpty = z.string().min(1);
const optStr = z.string().optional().nullable();

export const LoginSchema  = z.object({ email: z.string().email(), password: nonEmpty });

// Strong password: 8+ chars, lower, upper, digit, special.
const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]).{8,}$/;
export const SignupSchema = z.object({
  email:    z.string().email(),
  password: z.string().regex(strongPw, 'password too weak'),
});

export const ProfileSchema = z.object({
  name:   optStr,
  age:    z.number().int().nullable().optional(),
  height: z.union([z.number(), z.string()]).nullable().optional(),
  goal:   optStr,
});

export const WeekPlanSchema = z.object({
  sun: z.string().optional(),
  mon: z.string().optional(),
  tue: z.string().optional(),
  wed: z.string().optional(),
  thu: z.string().optional(),
  fri: z.string().optional(),
  sat: z.string().optional(),
});

// PRs are a map: { "Bench Press": { weight, reps, date } }
export const PrsSchema = z.record(z.string(), z.object({
  weight: z.union([z.number(), z.string()]).nullable().optional(),
  reps:   z.number().int().nullable().optional(),
  date:   z.string().nullable().optional(),
}));

export const ExerciseSchema = z.object({
  id:          nonEmpty,
  name:        nonEmpty,
  muscle:      nonEmpty,
  description: optStr,
});

export const ExerciseDeleteSchema = z.object({ id: nonEmpty });

const SetSchema = z.object({
  weight: optStr,
  reps:   optStr,
  done:   z.boolean().optional(),
});

const WorkoutExerciseSchema = z.object({
  name:         nonEmpty,
  restSeconds:  z.number().int().optional(),
  sets:         z.array(SetSchema).optional(),
});

export const WorkoutSchema = z.object({
  id:        z.number().int().or(z.string().regex(/^\d+$/).transform(Number)),
  name:      nonEmpty,
  muscles:   z.array(z.string()).optional(),
  date:      nonEmpty, // ISO string
  duration:  z.number().int().nullable().optional(),
  exercises: z.array(WorkoutExerciseSchema).optional(),
});

export const WorkoutDeleteSchema = z.object({
  id: z.number().int().or(z.string().regex(/^\d+$/).transform(Number)),
});

const PlanExerciseInput = z.union([
  nonEmpty,
  z.object({
    name:          z.string().optional(),
    exercise_name: z.string().optional(),
    restSeconds:   z.number().int().optional(),
    rest_seconds:  z.number().int().optional(),
  }),
]);

export const PlanSchema = z.object({
  id:          z.number().int().or(z.string().regex(/^\d+$/).transform(Number)),
  name:        nonEmpty,
  description: optStr,
  exercises:   z.array(PlanExerciseInput).optional(),
});

export const PlanDeleteSchema = z.object({
  id: z.number().int().or(z.string().regex(/^\d+$/).transform(Number)),
});

export const WeightCreateSchema = z.object({
  weight: z.union([z.number(), z.string()]),
  date:   nonEmpty,
  note:   optStr,
});

export const WeightDeleteSchema = z.object({
  id: z.number().int().or(z.string().regex(/^\d+$/).transform(Number)),
});

export const SupplementUpsertSchema = z.object({
  id:      nonEmpty,
  name:    nonEmpty,
  dose:    optStr,
  time:    optStr,
  enabled: z.boolean().optional(),
});

export const SupplementTakenSchema = z.object({
  id:    nonEmpty,
  date:  nonEmpty,
  taken: z.boolean(),
});

export const SupplementDeleteSchema = z.object({ id: nonEmpty });

export const CoachSchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).min(1),
  temperature: z.number().optional(),
  max_tokens:  z.number().int().optional(),
});
