import { Hono } from "hono";
import { cors } from "hono/cors";
import { profilesRoute } from "./routes/profiles.route";

const app = new Hono<{ Bindings: { DB: D1Database } }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  await next();
});

app.get("/", (c) => {
  return c.json({
    status: "success",
    data: { message: "API is running" },
  });
});

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
