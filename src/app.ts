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

const app = new OpenAPIHono<HonoEnv>({ strict: false });

app.use(
  "*",
  cors({
    origin: [`${getEnv().FRONTEND_URL}`],
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    // ADD "X-XSRF-TOKEN" to this array:
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Version",
      "X-XSRF-TOKEN",
    ],
  }),
);
// Versioning middleware
app.use("*", async (c, next) => {
  // 1. ADD THIS: Skip version check for OPTIONS (CORS preflight)
  if (c.req.method === "OPTIONS") {
    return await next();
  }

  if (
    c.req.path === "/doc" ||
    c.req.path === "/reference" ||
    c.req.path === "/favicon.ico" ||
    c.req.path.startsWith("/auth")
  ) {
    return await next();
  }

  const version = c.req.header("X-API-Version");
  if (version !== "1") {
    return c.json(
      {
        status: "error",
        message: "API version header required",
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

// Protected routes - apply auth middleware to all /api/profiles routes
app.use("/api/profiles*", authenticateToken, enforceActiveUser);
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
        message: "Invalid query parameters",
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
