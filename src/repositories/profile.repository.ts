import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { profiles } from "../db/schema";

export type ProfileRecord = typeof profiles.$inferSelect;
export type NewProfileRecord = typeof profiles.$inferInsert;

export type ProfileGender = "male" | "female";
export type AgeGroup = "child" | "teenager" | "adult" | "senior";
export type SortBy = "created_at" | "age" | "gender_probability";
export type SortOrder = "asc" | "desc";

export type ProfileFilters = {
  gender?: ProfileGender;
  countryId?: string;
  ageGroup?: AgeGroup;
  minAge?: number;
  maxAge?: number;
  minGenderProbability?: number;
  minCountryProbability?: number;
};

export type PaginationOptions = {
  page?: number;
  limit?: number;
};

export type SortOptions = {
  sortBy?: SortBy;
  sortOrder?: SortOrder;
};

export type ProfileListResult = {
  data: ProfileRecord[];
  total: number;
  page: number;
  limit: number;
};

type DbEnv = {
  DB: D1Database;
};

function buildConditions(filters: ProfileFilters) {
  const conditions: any[] = [];

  if (filters.gender) {
    conditions.push(eq(profiles.gender, filters.gender));
  }

  if (filters.countryId) {
    conditions.push(eq(profiles.countryId, filters.countryId));
  }

  if (filters.ageGroup) {
    conditions.push(eq(profiles.ageGroup, filters.ageGroup));
  }

  if (typeof filters.minAge === "number") {
    conditions.push(gte(profiles.age, filters.minAge));
  }

  if (typeof filters.maxAge === "number") {
    conditions.push(lte(profiles.age, filters.maxAge));
  }

  if (typeof filters.minGenderProbability === "number") {
    conditions.push(
      gte(profiles.genderProbability, filters.minGenderProbability),
    );
  }

  if (typeof filters.minCountryProbability === "number") {
    conditions.push(
      gte(profiles.countryProbability, filters.minCountryProbability),
    );
  }

  return conditions;
}

function buildOrder(sortBy: SortBy, sortOrder: SortOrder) {
  switch (sortBy) {
    case "age":
      return sortOrder === "desc" ? [desc(profiles.age)] : [asc(profiles.age)];
    case "gender_probability":
      return sortOrder === "desc"
        ? [desc(profiles.genderProbability)]
        : [asc(profiles.genderProbability)];
    case "created_at":
    default:
      return sortOrder === "desc"
        ? [desc(profiles.createdAt)]
        : [asc(profiles.createdAt)];
  }
}

export async function findProfileById(
  env: DbEnv,
  id: string,
): Promise<ProfileRecord | undefined> {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  return rows[0];
}

export async function findProfileByName(
  env: DbEnv,
  name: string,
): Promise<ProfileRecord | undefined> {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(profiles)
    .where(sql<boolean>`lower(${profiles.name}) = ${name.trim().toLowerCase()}`)
    .limit(1);
  return rows[0];
}

export async function createProfile(
  env: DbEnv,
  profile: NewProfileRecord,
): Promise<ProfileRecord> {
  const db = getDb(env);
  const rows = await db.insert(profiles).values(profile).returning();
  return rows[0];
}

export async function upsertProfile(
  env: DbEnv,
  profile: NewProfileRecord,
): Promise<ProfileRecord> {
  const db = getDb(env);
  const rows = await db
    .insert(profiles)
    .values(profile)
    .onConflictDoUpdate({
      target: profiles.name,
      set: {
        gender: profile.gender,
        genderProbability: profile.genderProbability,
        age: profile.age,
        ageGroup: profile.ageGroup,
        countryId: profile.countryId,
        countryName: profile.countryName,
        countryProbability: profile.countryProbability,
        createdAt: profile.createdAt,
      },
    })
    .returning();

  return rows[0];
}

export async function deleteProfileById(
  env: DbEnv,
  id: string,
): Promise<boolean> {
  const db = getDb(env);
  const rows = await db.delete(profiles).where(eq(profiles.id, id)).returning({
    id: profiles.id,
  });

  return rows.length > 0;
}

export async function listProfiles(
  env: DbEnv,
  filters: ProfileFilters = {},
  pagination: PaginationOptions = {},
  sort: SortOptions = {},
): Promise<ProfileListResult> {
  const db = getDb(env);

  const page = Math.max(1, pagination.page ?? 1);
  const limit = Math.max(1, Math.min(50, pagination.limit ?? 10));
  const offset = (page - 1) * limit;

  const conditions = buildConditions(filters);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy = buildOrder(
    sort.sortBy ?? "created_at",
    sort.sortOrder ?? "desc",
  );

  const dataQuery = db
    .select()
    .from(profiles)
    .where(whereClause)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  const countQuery = db
    .select({ total: count() })
    .from(profiles)
    .where(whereClause);

  const [data, totalResult] = await Promise.all([dataQuery, countQuery]);

  const total = totalResult[0]?.total ?? 0;

  return {
    data,
    total,
    page,
    limit,
  };
}
