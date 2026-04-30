import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  createProfileController,
  deleteProfileController,
  getProfileByIdController,
  listProfilesController,
  searchProfilesController,
  exportProfilesController,
} from "../controllers/profile.controller";
import {
  createProfileRequestSchema,
  profileParamsSchema,
  profileQuerySchema,
  profileResponseSchema,
  profileListResponseSchema,
  errorResponseSchema,
} from "../schemas/profile.schema";
import {
  authenticateToken,
  enforceActiveUser,
  requireRole,
} from "../middleware/auth.middleware";
import { HonoEnv } from "../types/hono";

export const profilesRoute = new OpenAPIHono<HonoEnv>();

// Apply auth middleware to all profile routes
profilesRoute.use("*", authenticateToken, enforceActiveUser);

const listProfilesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Profiles"],
  summary: "List all profiles with filtering and pagination",
  request: {
    query: profileQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: profileListResponseSchema,
        },
      },
      description: "List of profiles",
    },
    400: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Invalid query parameters",
    },
  },
});

const searchProfilesRoute = createRoute({
  method: "get",
  path: "/search",
  tags: ["Profiles"],
  summary: "Search profiles using natural language or keywords",
  request: {
    query: profileQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: profileListResponseSchema,
        },
      },
      description: "Search results",
    },
  },
});

const createProfileRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Profiles"],
  summary: "Create a new profile (Admin only)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createProfileRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: profileResponseSchema,
        },
      },
      description: "Profile created",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Forbidden - Admin role required",
    },
  },
});

const getProfileRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Profiles"],
  summary: "Get a profile by ID",
  request: {
    params: profileParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: profileResponseSchema,
        },
      },
      description: "Profile details",
    },
    404: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Profile not found",
    },
  },
});

const deleteProfileRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Profiles"],
  summary: "Delete a profile by ID (Admin only)",
  security: [{ bearerAuth: [] }],
  request: {
    params: profileParamsSchema,
  },
  responses: {
    204: {
      description: "Profile deleted",
    },
    403: {
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
      description: "Forbidden",
    },
  },
});

profilesRoute.openapi(listProfilesRoute, listProfilesController as any);
profilesRoute.openapi(searchProfilesRoute, searchProfilesController as any);

profilesRoute.openapi(createProfileRoute, (async (c: any) => {
  return createProfileController(c);
}) as any);

// For admin-only routes, we can use the middleware on the specific path
profilesRoute.use("/:id", async (c, next) => {
  if (c.req.method === "DELETE") return requireRole("admin")(c, next);
  return next();
});
profilesRoute.use("/", async (c, next) => {
  if (c.req.method === "POST") return requireRole("admin")(c, next);
  return next();
});

profilesRoute.openapi(getProfileRoute, getProfileByIdController as any);
profilesRoute.openapi(deleteProfileRoute, (async (c: any) => {
  return deleteProfileController(c);
}) as any);
profilesRoute.get("/export", exportProfilesController as any);
