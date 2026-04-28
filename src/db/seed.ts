import { drizzle } from "drizzle-orm/d1";
import type { AnyD1Database } from "drizzle-orm/d1";
import { createUuidV7 } from "../utils";
import { profiles } from "./schema";
import fs from "fs";
import path from "path";

type SeedProfile = Omit<
  typeof profiles.$inferInsert,
  "id" | "createdAt" | "countryName"
> & {
  id?: string;
  createdAt?: string;
  country_name?: string;
};

function getDatabase() {
  const database = (
    globalThis as typeof globalThis & {
      DB?: AnyD1Database;
    }
  ).DB;

  if (!database) {
    throw new Error(
      "No D1 binding found. Run the seed with Wrangler (local or remote) so the DB binding is available.",
    );
  }

  return drizzle(database, {
    schema: {
      profiles,
    },
  });
}

export async function seedDatabase() {
  const db = getDatabase();

  const dataPath = path.resolve(import.meta.dir, "seed-data/profiles.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  const parsedData = JSON.parse(rawData);
  const profilesList = parsedData.profiles || parsedData;

  const BATCH_SIZE = 50; // Cloudflare D1 limit per query is relatively small, so batching is needed
  let inserted = 0;

  for (let i = 0; i < profilesList.length; i += BATCH_SIZE) {
    const batch = profilesList.slice(i, i + BATCH_SIZE);

    const values = batch.map((profile: any) => ({
      id: profile.id ?? createUuidV7(),
      name: profile.name,
      gender: profile.gender,
      genderProbability: profile.gender_probability,
      age: profile.age,
      ageGroup: profile.age_group,
      countryId: profile.country_id,
      countryName: profile.country_name,
      countryProbability: profile.country_probability,
      createdAt: profile.created_at ?? new Date().toISOString(),
    }));

    await db
      .insert(profiles)
      .values(values)
      .onConflictDoNothing({ target: profiles.name });

    inserted += values.length;
    console.log(`Seeded ${inserted}/${profilesList.length} profiles...`);
  }

  console.log(`Successfully completed seeding ${inserted} profiles`);
}

if (import.meta.main) {
  seedDatabase().catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
}
