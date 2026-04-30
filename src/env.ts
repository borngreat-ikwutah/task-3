import { z } from "zod";

// Declare global Bun and process for TypeScript when bun-types/node-types are not in global scope
declare const Bun: any;
declare const process: any;

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  LOCAL_URL: z.string().url().optional(),
  PRODUCTION_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),

  // External APIs
  GENDERIZE_API_URL: z.string().url().default("https://api.genderize.io"),
  AGIFY_API_URL: z.string().url().default("https://api.agify.io"),
  NATIONALIZE_API_URL: z.string().url().default("https://api.nationalize.io"),

  // GitHub API URLs
  GITHUB_AUTH_URL: z
    .string()
    .url()
    .default("https://github.com/login/oauth/authorize"),
  GITHUB_TOKEN_URL: z
    .string()
    .url()
    .default("https://github.com/login/oauth/access_token"),
  GITHUB_USER_API_URL: z.string().url().default("https://api.github.com/user"),
  ADMIN_NAME: z.string().default("Borngreat Ikwutah"),
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
