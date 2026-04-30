import { Context, Next, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { verifyJwt } from "../lib/jwt";
import { AUTH_ERRORS, type AuthenticatedUser } from "../types/auth";
import { findUserByGithubId } from "../repositories/auth.repository";
import { HonoEnv } from "../types/hono";

/**
 * Extract token from Authorization header (Bearer <token>)
 */
function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  return scheme === "Bearer" ? token : null;
}

/**
 * Core authentication middleware
 */
export const authenticateToken: MiddlewareHandler<HonoEnv> = async (
  c: Context<HonoEnv>,
  next: Next,
) => {
  // 1. Try Header first, then try Cookie
  const token =
    extractBearerToken(c.req.header("Authorization")) ??
    getCookie(c, "access_token");

  const jwtSecret = c.env.JWT_ACCESS_SECRET;

  if (!token) {
    console.warn("[Auth] No token found in Authorization header or Cookies");
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.MISSING_TOKEN.code,
        message: AUTH_ERRORS.MISSING_TOKEN.message,
      },
      401,
    );
  }

  if (!jwtSecret) {
    console.error("[Auth] JWT_ACCESS_SECRET is not configured in environment");
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.MISSING_JWT_CONFIG.code,
        message: AUTH_ERRORS.MISSING_JWT_CONFIG.message,
      },
      500,
    );
  }

  // 2. Verify JWT
  const result = await verifyJwt({ token, secret: jwtSecret });

  if (!result.valid) {
    console.error("[Auth] JWT Verification failed:", result);
    const isExpired = result.reason === "expired";
    return c.json(
      {
        status: "error",
        code: isExpired
          ? AUTH_ERRORS.EXPIRED_TOKEN.code
          : AUTH_ERRORS.INVALID_TOKEN.code,
        message: isExpired
          ? AUTH_ERRORS.EXPIRED_TOKEN.message
          : "Session expired or invalid token",
      },
      401,
    );
  }

  const payload = result.payload;

  // 3. Check token type (Ensure it's an access token, not a refresh token)
  if (payload.type !== "access") {
    console.warn("[Auth] Invalid token type provided:", payload.type);
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.INVALID_TOKEN_TYPE.code,
        message: AUTH_ERRORS.INVALID_TOKEN_TYPE.message,
      },
      401,
    );
  }

  // 4. Resolve User from Database
  let authenticatedUser: AuthenticatedUser | null = null;

  if (payload.githubId) {
    try {
      // Ensure your repository uses the correct DB binding from c.env
      const user = await findUserByGithubId(
        c.env as any,
        payload.githubId as string,
      );

      if (user) {
        authenticatedUser = {
          id: user.id,
          githubId: user.githubId,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: (user.role as "admin" | "analyst") || "analyst",
          isActive: user.isActive,
        };
      } else {
        console.warn(
          `[Auth] User not found in database for GitHub ID: ${payload.githubId}`,
        );
      }
    } catch (error) {
      console.error("[Auth] Database lookup error:", error);
    }
  }

  // 5. Final check: Reject if user context couldn't be built
  if (!authenticatedUser) {
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.INVALID_TOKEN.code,
        message: "User account no longer exists or is invalid",
      },
      401,
    );
  }

  // Success: Attach to context
  c.set("user", authenticatedUser);
  c.set("payload", payload);

  await next();
};

/**
 * Enforce that user is active
 */
export const enforceActiveUser: MiddlewareHandler<HonoEnv> = async (
  c,
  next,
) => {
  const user = c.get("user");

  if (!user?.isActive) {
    console.warn(`[Auth] Inactive user attempted access: ${user?.username}`);
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.USER_INACTIVE.code,
        message: AUTH_ERRORS.USER_INACTIVE.message,
      },
      403,
    );
  }

  await next();
};

/**
 * Role-Based Access Control
 */
export function requireRole(
  ...roles: ("admin" | "analyst")[]
): MiddlewareHandler<HonoEnv> {
  return async (c: Context<HonoEnv>, next: Next) => {
    const user = c.get("user");

    if (!user || !roles.includes(user.role)) {
      return c.json(
        {
          status: "error",
          code: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.code,
          message: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS.message,
        },
        403,
      );
    }

    await next();
  };
}
