import { Hono } from "hono";
import {
  loginWithGitHub,
  gitHubCallback,
  refreshTokens,
  logout,
} from "../controllers/auth.controller";
import { HonoEnv } from "../types/hono";

export const authRoute = new Hono<HonoEnv>()
  .get("/github", loginWithGitHub)
  .get("/github/callback", gitHubCallback)
  .post("/refresh", refreshTokens)
  .post("/logout", logout);
