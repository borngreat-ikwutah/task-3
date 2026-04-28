/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    DATABASE_URL?: string;
    NODE_ENV?: "development" | "test" | "production";
  }

  namespace Hono {
    interface Env {
      Bindings: CloudflareEnv;
    }
  }
}

export {};
