import { JwtPayload } from "../lib/jwt";
import { AuthenticatedUser } from "./auth";

export type AppBindings = {
  DB: D1Database;
  NODE_ENV?: "development" | "test" | "production";
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_CALLBACK_URL?: string;
  LOCAL_URL?: string;
  PRODUCTION_URL?: string;
  FRONTEND_URL?: string;

  // External APIs
  GENDERIZE_API_URL?: string;
  AGIFY_API_URL?: string;
  NATIONALIZE_API_URL?: string;

  // GitHub API URLs
  GITHUB_AUTH_URL?: string;
  GITHUB_TOKEN_URL?: string;
  GITHUB_USER_API_URL?: string;
  ADMIN_NAME?: string;
};

export type AppVariables = {
  user: AuthenticatedUser;
  payload: JwtPayload;
};

export type HonoEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};
