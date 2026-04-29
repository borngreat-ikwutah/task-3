import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    githubId: text("github_id").notNull().unique(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    avatarUrl: text("avatar_url").notNull(),
    role: text("role").notNull().default("analyst"), // admin or analyst
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    lastLoginAt: text("last_login_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    githubIdIdx: index("users_github_id_idx").on(table.githubId),
    roleIdx: index("users_role_idx").on(table.role),
    isActiveIdx: index("users_is_active_idx").on(table.isActive),
  }),
);

export const refreshTokens = sqliteTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at").notNull(), // Unix timestamp
    revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    userIdIdx: index("refresh_tokens_user_id_idx").on(table.userId),
    tokenIdx: index("refresh_tokens_token_idx").on(table.token),
  }),
);

export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),

    gender: text("gender").notNull(),
    genderProbability: real("gender_probability").notNull(),

    age: integer("age").notNull(),
    ageGroup: text("age_group").notNull(),

    countryId: text("country_id").notNull(),
    countryName: text("country_name").notNull(),
    countryProbability: real("country_probability").notNull(),

    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    genderIdx: index("profiles_gender_idx").on(table.gender),
    ageIdx: index("profiles_age_idx").on(table.age),
    ageGroupIdx: index("profiles_age_group_idx").on(table.ageGroup),
    countryIdIdx: index("profiles_country_id_idx").on(table.countryId),
    createdAtIdx: index("profiles_created_at_idx").on(table.createdAt),
    genderProbIdx: index("profiles_gender_prob_idx").on(
      table.genderProbability,
    ),
    countryProbIdx: index("profiles_country_prob_idx").on(
      table.countryProbability,
    ),
  }),
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
