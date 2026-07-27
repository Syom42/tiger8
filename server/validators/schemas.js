// All request-body schemas in one place.
import { z } from 'zod';

const nonEmpty = z.string().trim().min(1).max(160);
const optStr = z.string().trim().max(1000).optional().nullable();
const positiveInteger = z.coerce.number().int().positive();
const finiteNumber = z.coerce.number().finite();

export const LoginSchema  = z.object({ email: z.string().email(), password: nonEmpty });

// Strong password: 8+ chars, lower, upper, digit, special.
const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':",.<>/?\\|`~]).{8,}$/;
export const SignupSchema = z.object({
  email:    z.string().email(),
  password: z.string().regex(strongPw, 'password too weak'),
});

export const ProfileSchema = z.object({
  name:   z.string().trim().min(1).max(120).nullable().optional(),
  age:    z.coerce.number().int().min(13).max(120).nullable().optional(),
  height: finiteNumber.min(50).max(300).nullable().optional(),
  goal:   optStr,
});

const PlanIdSchema = positiveInteger.nullable().optional();
export const WeekPlanSchema = z.object({
  sun: PlanIdSchema,
  mon: PlanIdSchema,
  tue: PlanIdSchema,
  wed: PlanIdSchema,
  thu: PlanIdSchema,
  fri: PlanIdSchema,
  sat: PlanIdSchema,
});

// PRs are a map: { "Bench Press": { weight, reps, date } }
export const PrsSchema = z.record(z.string(), z.object({
  weight: z.union([z.number(), z.string()]).nullable().optional(),
  reps:   z.number().int().nullable().optional(),
  date:   z.string().nullable().optional(),
}));

export const ExerciseSchema = z.object({
  id:          nonEmpty.optional(),
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
  id:        z.number().int().or(z.string().regex(/^\d+$/).transform(Number)).optional(),
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
  id:          z.number().int().or(z.string().regex(/^\d+$/).transform(Number)).optional(),
  name:        nonEmpty,
  description: optStr,
  exercises:   z.array(PlanExerciseInput).optional(),
});

export const PlanDeleteSchema = z.object({
  id: z.number().int().or(z.string().regex(/^\d+$/).transform(Number)),
});

export const WeightCreateSchema = z.object({
  weight: finiteNumber.min(20).max(500),
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid date'),
  note:   optStr,
});

export const WeightDeleteSchema = z.object({
  id: z.number().int().or(z.string().regex(/^\d+$/).transform(Number)),
});

export const SupplementUpsertSchema = z.object({
  id:      nonEmpty.optional(),
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
    role:    z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(2000),
  })).min(1).max(12),
  temperature: z.number().min(0).max(1).optional(),
  max_tokens:  z.number().int().min(1).max(512).optional(),
}).strict();
