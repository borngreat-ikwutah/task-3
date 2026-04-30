import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  loginWithGitHub,
  gitHubCallback,
  refreshTokens,
  logout,
} from "../controllers/auth.controller";
import {
  authenticateToken,
  enforceActiveUser,
} from "../middleware/auth.middleware";
import { HonoEnv } from "../types/hono";
import { errorResponseSchema } from "../schemas/profile.schema";
import { zValidator } from "@hono/zod-validator";

export const authRoute = new OpenAPIHono<HonoEnv>();

const loginRoute = createRoute({
  method: "get",
  path: "/github",
  tags: ["Authentication"],
  summary: "Redirect to GitHub OAuth login",
  responses: {
    302: {
      description: "Redirect to GitHub",
    },
  },
});

const tokenPairResponseSchema = z.object({
  status: z.literal("success"),
  access_token: z.string(),
  refresh_token: z.string(),
});

const callbackRoute = createRoute({
  method: "get",
  path: "/github/callback",
  tags: ["Authentication"],
  summary: "GitHub OAuth callback handler",
  responses: {
    302: {
      description: "Redirect to frontend dashboard for web clients",
    },
    200: {
      description: "Successful login with tokens for CLI clients",
      content: {
        "application/json": {
          schema: tokenPairResponseSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid request",
    },
  },
});

const refreshRequestSchema = z.object({
  refresh_token: z.string(),
});

const refreshRoute = createRoute({
  method: "post",
  path: "/refresh",
  tags: ["Authentication"],
  summary: "Refresh access and refresh tokens",
  request: {
    body: {
      content: {
        "application/json": {
          schema: refreshRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "New token pair",
      content: {
        "application/json": {
          schema: tokenPairResponseSchema,
        },
      },
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Bad request",
    },
    401: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid or expired refresh token",
    },
  },
});

const logoutRequestSchema = z.object({
  refresh_token: z.string(),
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Authentication"],
  summary: "Logout and invalidate tokens",
  request: {
    body: {
      content: {
        "application/json": {
          schema: logoutRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully logged out",
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("success"),
          }),
        },
      },
    },
  },
});

const whoamiRoute = createRoute({
  method: "get",
  path: "/whoami",
  tags: ["Authentication"],
  summary: "Get current authenticated user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Current user details",
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("success"),
            data: z.object({
              id: z.string(),
              githubId: z.string(),
              username: z.string(),
              email: z.string(),
              avatarUrl: z.string(),
              role: z.enum(["admin", "analyst"]),
              isActive: z.boolean(),
            }),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

authRoute.openapi(loginRoute, loginWithGitHub);
authRoute.openapi(callbackRoute, gitHubCallback as any);
authRoute.openapi(refreshRoute, zValidator("json", refreshRequestSchema) as any, refreshTokens as any);
authRoute.openapi(logoutRoute, zValidator("json", logoutRequestSchema) as any, logout as any);
authRoute.use("/whoami", authenticateToken, enforceActiveUser);

authRoute.openapi(whoamiRoute, (async (c: any) => {
  const user = c.get("user");
  return c.json(
    {
      status: "success" as const,
      data: user,
    },
    200,
  );
}) as any);
