import { Context } from "hono";
import {
  getGitHubAuthorizeUrl,
  handleGitHubCallback,
  refreshTokensService,
  logoutService,
} from "../services/auth.service";
import { AuthError } from "../types/auth";
import { HonoEnv } from "../types/hono";

export async function loginWithGitHub(c: Context<HonoEnv>) {
  const state = c.req.query("state") || crypto.randomUUID();
  const codeChallenge = c.req.query("code_challenge");

  try {
    const url = getGitHubAuthorizeUrl(c.env, state, codeChallenge);
    return c.redirect(url);
  } catch (error) {
    if (error instanceof AuthError) {
      return c.json(
        {
          status: "error",
          code: error.code,
          message: error.message,
        },
        error.statusCode as any,
      );
    }
    throw error;
  }
}

export async function gitHubCallback(c: Context<HonoEnv>) {
  const code = c.req.query("code");
  const codeVerifier = c.req.query("code_verifier");

  if (!code) {
    return c.json(
      {
        status: "error",
        message: "Missing authorization code",
      },
      400,
    );
  }

  try {
    const result = await handleGitHubCallback(c.env, code, codeVerifier);
    return c.json(
      {
        status: "success",
        data: {
          user: result.user,
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        },
      },
      200,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return c.json(
        {
          status: "error",
          code: error.code,
          message: error.message,
        },
        error.statusCode as any,
      );
    }
    throw error;
  }
}

export async function refreshTokens(c: Context<HonoEnv>) {
  const body = await c.req.json().catch(() => ({}));
  const refreshToken = body.refresh_token;

  if (!refreshToken) {
    return c.json(
      {
        status: "error",
        message: "Missing refresh token",
      },
      400,
    );
  }

  try {
    const tokens = await refreshTokensService(c.env, refreshToken);
    return c.json(
      {
        status: "success",
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      },
      200,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return c.json(
        {
          status: "error",
          code: error.code,
          message: error.message,
        },
        error.statusCode as any,
      );
    }
    throw error;
  }
}

export async function logout(c: Context<HonoEnv>) {
  const body = await c.req.json().catch(() => ({}));
  const refreshToken = body.refresh_token;

  if (refreshToken) {
    await logoutService(c.env, refreshToken);
  }

  return c.json(
    {
      status: "success",
      message: "Logged out successfully",
    },
    200,
  );
}
