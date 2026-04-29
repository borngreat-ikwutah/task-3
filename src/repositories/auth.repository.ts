import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client";
import { users, refreshTokens, type User, type NewUser, type RefreshToken, type NewRefreshToken } from "../db/schema";

type DbEnv = {
  DB: D1Database;
};

export async function findUserByGithubId(
  env: DbEnv,
  githubId: string,
): Promise<User | undefined> {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.githubId, githubId))
    .limit(1);

  return rows[0];
}

export async function findUserById(
  env: DbEnv,
  id: string,
): Promise<User | undefined> {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return rows[0];
}

export async function upsertUser(
  env: DbEnv,
  user: NewUser,
): Promise<User> {
  const db = getDb(env);
  const rows = await db
    .insert(users)
    .values(user)
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt,
      },
    })
    .returning();

  return rows[0];
}

export async function createRefreshToken(
  env: DbEnv,
  data: NewRefreshToken,
): Promise<RefreshToken> {
  const db = getDb(env);
  const rows = await db.insert(refreshTokens).values(data).returning();
  return rows[0];
}

export async function findRefreshToken(
  env: DbEnv,
  token: string,
): Promise<RefreshToken | undefined> {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.token, token), eq(refreshTokens.revoked, false)))
    .limit(1);

  return rows[0];
}

export async function revokeRefreshToken(
  env: DbEnv,
  token: string,
): Promise<void> {
  const db = getDb(env);
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.token, token));
}

export async function revokeAllUserRefreshTokens(
  env: DbEnv,
  userId: string,
): Promise<void> {
  const db = getDb(env);
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.userId, userId));
}
