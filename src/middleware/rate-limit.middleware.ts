import { MiddlewareHandler } from "hono";

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(limit: number, windowMs: number): MiddlewareHandler {
  return async (c, next) => {
    // Try to get IP from various headers used by Cloudflare
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-real-ip") ||
      c.req.header("x-forwarded-for") ||
      "anonymous";

    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
      return await next();
    }

    if (record.count >= limit) {
      return c.json(
        {
          status: "error",
          message: "Too many requests, please try again later.",
        },
        429,
      );
    }

    record.count++;
    await next();
  };
}
