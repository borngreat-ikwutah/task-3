import { drizzle } from "drizzle-orm/d1";
import { profiles } from "./schema";

export type Database = ReturnType<typeof drizzle>;

export function getDb(env: { DB: D1Database }) {
  return drizzle(env.DB, {
    schema: {
      profiles,
    },
  });
}
