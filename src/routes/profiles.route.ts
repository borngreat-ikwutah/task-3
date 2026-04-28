import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  createProfileController,
  deleteProfileController,
  getProfileByIdController,
  listProfilesController,
  searchProfilesController,
} from "../controllers/profile.controller";
import {
  createProfileRequestSchema,
  profileParamsSchema,
  profileQuerySchema,
} from "../schemas/profile.schema";

export const profilesRoute = new Hono()
  .post(
    "/",
    zValidator("json", createProfileRequestSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            status: "error",
            message: "Invalid request body",
          },
          422,
        );
      }
    }),
    createProfileController,
  )
  .get(
    "/",
    zValidator("query", profileQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            status: "error",
            message: "Invalid query parameters",
          },
          400,
        );
      }
    }),
    listProfilesController,
  )
  .get(
    "/search",
    zValidator("query", profileQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            status: "error",
            message: "Invalid query parameters",
          },
          400,
        );
      }
    }),
    searchProfilesController,
  )
  .get(
    "/:id",
    zValidator("param", profileParamsSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            status: "error",
            message: "Invalid profile id",
          },
          400,
        );
      }
    }),
    getProfileByIdController,
  )
  .delete(
    "/:id",
    zValidator("param", profileParamsSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            status: "error",
            message: "Invalid profile id",
          },
          400,
        );
      }
    }),
    deleteProfileController,
  );
