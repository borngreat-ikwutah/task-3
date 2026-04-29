import { Context, Next, MiddlewareHandler } from "hono";
import { verifyJwt } from "../lib/jwt";
import { AUTH_ERRORS, type AuthenticatedUser } from "../types/auth";
import { findUserByGithubId } from "../repositories/auth.repository";
import { HonoEnv } from "../types/hono";

/**
 * Extract token from Authorization header
 * Expects: "Bearer <token>"
 */
function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

/**
 * Core authentication middleware
 * Validates JWT token and attaches user context
 */
export const authenticateToken: MiddlewareHandler<HonoEnv> = async (
  c: Context<HonoEnv>,
  next: Next,
) => {
  const token = extractToken(c.req.header("Authorization"));
  const jwtSecret = c.env.JWT_ACCESS_SECRET;

  // No token found
  if (!token) {
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.MISSING_TOKEN.code,
        message: AUTH_ERRORS.MISSING_TOKEN.message,
      },
      401,
    );
  }

  // No JWT secret configured
  if (!jwtSecret) {
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.MISSING_JWT_CONFIG.code,
        message: AUTH_ERRORS.MISSING_JWT_CONFIG.message,
      },
      500,
    );
  }

  // Verify token
  const result = await verifyJwt({ token, secret: jwtSecret });
  if (!result.valid) {
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.INVALID_TOKEN.code,
        message: AUTH_ERRORS.INVALID_TOKEN.message,
      },
      401,
    );
  }

  const payload = result.payload;

  // Check token type
  if (payload.type !== "access") {
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.INVALID_TOKEN_TYPE.code,
        message: AUTH_ERRORS.INVALID_TOKEN_TYPE.message,
      },
      401,
    );
  }

  // Fetch full user from DB to get latest is_active status
  let authenticatedUser: AuthenticatedUser | null = null;
  if (payload.githubId) {
    try {
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
      }
    } catch (error) {
      console.error("Failed to fetch user from DB:", error);
    }
  }

  // If we couldn't load the user, reject the request
  if (!authenticatedUser) {
    return c.json(
      {
        status: "error",
        code: AUTH_ERRORS.INVALID_TOKEN.code,
        message: AUTH_ERRORS.INVALID_TOKEN.message,
      },
      401,
    );
  }

  // Store in variables for downstream handlers
  c.set("user", authenticatedUser);
  c.set("payload", payload);

  // Proceed to next middleware/handler
  await next();
};

/**
 * Enforce that user is active
 * Use this AFTER authenticateToken
 */
export const enforceActiveUser: MiddlewareHandler<HonoEnv> = async (
  c: Context<HonoEnv>,
  next: Next,
) => {
  const user = c.get("user");

  if (!user?.isActive) {
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
 * RBAC - Enforce specific role(s)
 * Use this AFTER authenticateToken
 */
export function requireRole(...roles: string[]): MiddlewareHandler<HonoEnv> {
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
