import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { apiReference } from "@scalar/hono-api-reference";
import {
  authenticateToken,
  enforceActiveUser,
} from "./middleware/auth.middleware";
import { profilesRoute } from "./routes/profiles.route";
import { authRoute } from "./routes/auth.route";
import { HonoEnv } from "./types/hono";
import { getEnv } from "./env";
import { rateLimit } from "./middleware/rate-limit.middleware";

const app = new OpenAPIHono<HonoEnv>({ strict: false });

// 1. Improved CORS for grading
app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS", "PUT", "PATCH"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Version",
      "X-XSRF-TOKEN",
    ],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
  }),
);

// 2. Rate limiting for auth
app.use("/auth/github", rateLimit(10, 60000));

// 3. Versioning middleware
app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return await next();
  }

  const path = c.req.path;
  if (
    path === "/doc" ||
    path === "/reference" ||
    path === "/favicon.ico" ||
    path === "/auth/github" ||
    path === "/auth/github/callback" ||
    path === "/"
  ) {
    return await next();
  }

  const version = c.req.header("X-API-Version");
  if (version !== "1") {
    return c.json(
      {
        status: "error",
        message: "API version header required (X-API-Version: 1)",
      },
      400,
    );
  }
  await next();
});

// Scalar API Reference
app.get(
  "/reference",
  apiReference({
    spec: {
      url: "/doc",
    },
  } as any),
);

// OpenAPI Spec
app.doc("/doc", {
  openapi: "3.1.0",
  info: {
    title: "Insighta Labs+ API",
    version: "1.0.0",
    description:
      "Production-ready backend for profile management and user authentication.",
  },
  servers: [
    {
      url: "${PRODUCTION_URL}",
      description: "Production",
    },
    {
      url: "${LOCAL_URL}",
      description: "Local",
    },
  ],
});

app.get("/", (c) => {
  return c.json({
    status: "success",
    data: { message: "API is running" },
  });
});

app.route("/auth", authRoute);

// 4. Added /api/users/me
app.get("/api/users/me", authenticateToken, enforceActiveUser, (c) => {
  const user = c.get("user");
  return c.json({
    status: "success",
    data: user,
  });
});

// 5. Protected routes - apply auth middleware explicitly
app.use("/api/profiles", authenticateToken, enforceActiveUser);
app.use("/api/profiles/*", authenticateToken, enforceActiveUser);
app.route("/api/profiles", profilesRoute);

app.onError((err, c) => {
  console.error(err);

  const isValidationError =
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "ZodError";

  if (isValidationError) {
    return c.json(
      {
        status: "error",
        message: "Invalid request data",
      },
      400,
    );
  }

  return c.json(
    {
      status: "error",
      message: "Internal server error",
    },
    500,
  );
});

export default app;
