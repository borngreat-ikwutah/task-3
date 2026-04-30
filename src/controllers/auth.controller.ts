import { Context } from "hono";
import { setCookie } from "hono/cookie";
import {
  getGitHubAuthorizeUrl,
  handleGitHubCallback,
  refreshTokensService,
  logoutService,
} from "../services/auth.service";
import { AuthError } from "../types/auth";
import { HonoEnv } from "../types/hono";
import { getEnv } from "../env";

export async function loginWithGitHub(c: Context<HonoEnv>) {
  const state = c.req.query("state") || crypto.randomUUID();
  const codeChallenge = c.req.query("code_challenge");

  if (codeChallenge && codeChallenge.length < 43) {
    return c.json(
      {
        status: "error" as const,
        code: "INVALID_PKCE",
        message: "Invalid PKCE challenge",
      },
      400,
    );
  }

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

function setAuthCookies(
  c: Context<HonoEnv>,
  accessToken: string,
  refreshToken: string,
) {
  const isProduction = c.env.NODE_ENV === "production";

  setCookie(c, "access_token", accessToken, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: isProduction,
    maxAge: 60 * 3,
  });

  setCookie(c, "refresh_token", refreshToken, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: isProduction,
    maxAge: 60 * 5,
  });
}

export async function gitHubCallback(c: Context<HonoEnv>) {
  const code = c.req.query("code");
  const codeVerifier = c.req.query("code_verifier");
  const mode = c.req.query("mode") || "web";

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

    if (mode === "cli") {
      return c.json(
        {
          status: "success" as const,
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        },
        200,
      );
    }

    setAuthCookies(c, result.accessToken, result.refreshToken);

    const frontendUrl = getEnv().FRONTEND_URL || "http://localhost:3000";
    return c.redirect(`${frontendUrl}`);
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
        status: "success" as const,
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
  // Ensure it's a POST request (Hono route will enforce this, but double check here if needed)
  if (c.req.method !== "POST") {
    return c.json(
      {
        status: "error",
        message: "Method not allowed",
      },
      405,
    );
  }

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
    await logoutService(c.env, refreshToken);
    return c.json(
      {
        status: "success" as const,
        message: "Logged out successfully",
      },
      200,
    );
  } catch (error) {
    return c.json(
      {
        status: "error",
        message: "Failed to logout",
      },
      500,
    );
  }
}
