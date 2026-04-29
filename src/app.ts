import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  authenticateToken,
  enforceActiveUser,
} from "./middleware/auth.middleware";
import { profilesRoute } from "./routes/profiles.route";
import { authRoute } from "./routes/auth.route";
import { HonoEnv } from "./types/hono";

const app = new Hono<HonoEnv>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Version"],
  }),
);

app.use("*", async (c, next) => {
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

  c.header("Access-Control-Allow-Origin", "*");
  await next();
});

app.get("/", (c) => {
  return c.json({
    status: "success",
    data: { message: "API is running" },
  });
});

app.route("/auth", authRoute);

// Protected routes - apply auth middleware to api/profiles
const protectedProfiles = new Hono<HonoEnv>()
  .use(authenticateToken)
  .use(enforceActiveUser)
  .route("", profilesRoute);

app.route("/api/profiles", protectedProfiles);

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
