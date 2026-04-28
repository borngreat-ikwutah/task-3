import type { Context } from "hono";
import {
  createProfileService,
  deleteProfileService,
  getProfileByIdService,
  listProfilesService,
  type ApiError,
  type ApiSuccess,
  type ProfileResponse,
  type WorkerEnv,
} from "../services/profile.service";
import {
  profileParamsSchema,
  profileQuerySchema,
  type ProfileQuery,
} from "../schemas/profile.schema";
import { parseProfileQuery } from "../parsers/profile-query.parser";

function toErrorResponse(message: string): ApiError {
  return {
    status: "error",
    message,
  };
}

function isAppError(
  error: unknown,
): error is { status: "error"; message: string; code?: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error &&
    (error as { status?: unknown }).status === "error"
  );
}

function buildProfileFilters(query: ProfileQuery) {
  return {
    gender: query.gender,
    countryId: query.country_id,
    ageGroup: query.age_group,
    minAge: query.min_age,
    maxAge: query.max_age,
    minGenderProbability: query.min_gender_probability,
    minCountryProbability: query.min_country_probability,
  };
}

function buildPagination(query: ProfileQuery) {
  return {
    page: query.page,
    limit: query.limit,
  };
}

function buildSort(query: ProfileQuery) {
  return {
    sortBy: query.sort_by,
    sortOrder: query.order,
  };
}

export async function createProfileController(
  c: Context<{ Bindings: WorkerEnv }>,
) {
  try {
    const body = await c.req.json().catch(() => null);
    const profile = await createProfileService(c.env, body);

    return c.json<ApiSuccess<ProfileResponse>>(
      {
        status: "success",
        data: profile,
      },
      201,
    );
  } catch (error) {
    if (isAppError(error)) {
      const status = typeof error.code === "number" ? error.code : 400;
      return c.json<ApiError>(
        toErrorResponse(error.message),
        status as 400 | 422 | 500,
      );
    }

    console.error(error);
    return c.json<ApiError>(toErrorResponse("Internal server error"), 500);
  }
}

export async function getProfileByIdController(
  c: Context<{ Bindings: WorkerEnv }>,
) {
  try {
    const parsed = profileParamsSchema.safeParse(c.req.param());
    if (!parsed.success) {
      return c.json<ApiError>(toErrorResponse("Invalid profile id"), 400);
    }

    const profile = await getProfileByIdService(c.env, parsed.data.id);

    if (!profile) {
      return c.json<ApiError>(toErrorResponse("Profile not found"), 404);
    }

    return c.json<ApiSuccess<ProfileResponse>>({
      status: "success",
      data: profile,
    });
  } catch (error) {
    console.error(error);
    return c.json<ApiError>(toErrorResponse("Internal server error"), 500);
  }
}

export async function listProfilesController(
  c: Context<{ Bindings: WorkerEnv }>,
) {
  try {
    const parsed = profileQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json<ApiError>(toErrorResponse("Invalid query parameters"), 400);
    }

    const query = parsed.data;
    const filters = buildProfileFilters(query);
    const pagination = buildPagination(query);
    const sort = buildSort(query);

    const result = await listProfilesService(c.env, filters, pagination, sort);

    return c.json({
      status: "success",
      page: result.page,
      limit: result.limit,
      total: result.total,
      data: result.data,
    });
  } catch (error) {
    console.error(error);
    return c.json<ApiError>(toErrorResponse("Internal server error"), 500);
  }
}

export async function searchProfilesController(
  c: Context<{ Bindings: WorkerEnv }>,
) {
  try {
    const parsed = profileQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json<ApiError>(toErrorResponse("Invalid query parameters"), 400);
    }

    const query = parsed.data;
    const naturalLanguage = query.q?.trim();

    if (!naturalLanguage) {
      return c.json<ApiError>(
        toErrorResponse("Unable to interpret query"),
        400,
      );
    }

    const parsedNaturalLanguage = parseProfileQuery(naturalLanguage);

    if (parsedNaturalLanguage.isUninterpretable) {
      return c.json<ApiError>(
        toErrorResponse("Unable to interpret query"),
        400,
      );
    }

    // Merge baseline query filters and what parsed from NLP
    const filters = {
      ...buildProfileFilters(query),
      ...(parsedNaturalLanguage?.filters ?? {}),
    };

    const pagination = buildPagination(query);
    const sort = buildSort(query);

    const result = await listProfilesService(c.env, filters, pagination, sort);

    return c.json({
      status: "success",
      page: result.page,
      limit: result.limit,
      total: result.total,
      data: result.data,
    });
  } catch (error) {
    console.error(error);
    return c.json<ApiError>(toErrorResponse("Internal server error"), 500);
  }
}

export async function deleteProfileController(
  c: Context<{ Bindings: WorkerEnv }>,
) {
  try {
    const parsed = profileParamsSchema.safeParse(c.req.param());
    if (!parsed.success) {
      return c.json<ApiError>(toErrorResponse("Invalid profile id"), 400);
    }

    const deleted = await deleteProfileService(c.env, parsed.data.id);

    if (!deleted) {
      return c.json<ApiError>(toErrorResponse("Profile not found"), 404);
    }

    return c.body(null, 204);
  } catch (error) {
    console.error(error);
    return c.json<ApiError>(toErrorResponse("Internal server error"), 500);
  }
}
