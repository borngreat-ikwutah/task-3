import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type EnvInput = Record<string, string | undefined>;

function getRawEnv(): EnvInput {
  if (typeof Bun !== "undefined" && Bun.env) {
    return Bun.env as EnvInput;
  }

  if (typeof process !== "undefined" && process.env) {
    return process.env as EnvInput;
  }

  return {};
}

export function getEnv() {
  const parsed = envSchema.safeParse(getRawEnv());

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.format());
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export type Env = ReturnType<typeof getEnv>;
