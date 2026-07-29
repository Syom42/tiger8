import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { userProfiles, users } from '../db/schema.js';
import type { ProfileInput } from '../validators/profile.js';

export interface ProfileFields {
  name: string | null;
  age: number | null;
  /** numeric column — the driver returns it as a string. */
  height: string | null;
  goal: string | null;
  joined_at: Date | null;
}

/** A user with no `user_profiles` row yet only has an email. */
export type ProfileDto = Partial<ProfileFields> & { email: string };

export async function getProfile(uid: number, fallbackEmail: string): Promise<ProfileDto> {
  const rows = await db
    .select({
      name: userProfiles.name,
      age: userProfiles.age,
      height: userProfiles.height,
      goal: userProfiles.goal,
      joined_at: userProfiles.joinedAt,
      email: users.email,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, uid));

  return rows.at(0) ?? { email: fallbackEmail };
}

export async function saveProfile(uid: number, input: ProfileInput): Promise<void> {
  const values = {
    name: input.name ?? null,
    age: input.age ?? null,
    // `height` is a numeric column — the driver expects a string.
    height: input.height === null || input.height === undefined ? null : String(input.height),
    goal: input.goal ?? null,
  };
  await db
    .insert(userProfiles)
    .values({ userId: uid, ...values })
    .onConflictDoUpdate({ target: userProfiles.userId, set: values });
}
