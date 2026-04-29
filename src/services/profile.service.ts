import { buildExternalProfileData } from "../lib/external-apis";
import { createProfileRequestSchema } from "../schemas/profile.schema";
import {
  createProfile,
  deleteProfileById,
  findProfileById,
  findProfileByName,
  listProfiles,
  type NewProfileRecord,
  type ProfileRecord,
  type ProfileFilters,
  type PaginationOptions,
  type SortOptions,
} from "../repositories/profile.repository";
import { createUuidV7, normalizeName } from "../utils";

export type WorkerEnv = {
  DB: D1Database;
};

export type ApiError = {
  status: "error";
  message: string;
  code?: number;
};

export type ApiSuccess<T> = {
  status: "success";
  data: T;
};

export type ProfileResponse = {
  id: string;
  name: string;
  gender: string;
  gender_probability: number;
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  country_probability: number;
  created_at: string;
};

// Based on task description, the list items must are identical to full profiles
export type ProfileListItem = ProfileResponse;

export type ProfileListResponse = {
  status: "success";
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  links: {
    self: string;
    next: string | null;
    prev: string | null;
  };
  data: ProfileListItem[];
};

export type ProfileQueryFilters = ProfileFilters;
export type ProfileListPagination = PaginationOptions;
export type ProfileListSort = SortOptions;

export type CreateProfileResult =
  | {
      alreadyExists: true;
      profile: ProfileResponse;
    }
  | {
      alreadyExists: false;
      profile: ProfileResponse;
    };

function toProfileResponse(profile: ProfileRecord): ProfileResponse {
  return {
    id: profile.id,
    name: profile.name,
    gender: profile.gender,
    gender_probability: profile.genderProbability,
    age: profile.age,
    age_group: profile.ageGroup,
    country_id: profile.countryId,
    country_name: profile.countryName,
    country_probability: profile.countryProbability,
    created_at: profile.createdAt,
  };
}

function validateCreateProfileInput(input: unknown) {
  return createProfileRequestSchema.safeParse(input);
}

export async function createOrGetProfile(
  env: WorkerEnv,
  rawName: string,
): Promise<CreateProfileResult> {
  const normalizedName = normalizeName(rawName);

  if (!normalizedName) {
    throw {
      status: "error",
      message: "Missing or empty name",
    } satisfies ApiError;
  }

  const existing = await findProfileByName(env, normalizedName);
  if (existing) {
    return {
      alreadyExists: true,
      profile: toProfileResponse(existing),
    };
  }

  const externalData = await buildExternalProfileData(env, normalizedName);

  const newProfile: NewProfileRecord = {
    id: createUuidV7(),
    name: normalizedName,
    gender: externalData.gender,
    genderProbability: externalData.genderProbability,
    age: externalData.age,
    ageGroup: externalData.ageGroup,
    countryId: externalData.countryId,
    countryName: externalData.countryName,
    countryProbability: externalData.countryProbability,
    createdAt: new Date().toISOString(),
  };

  const created = await createProfile(env, newProfile);

  return {
    alreadyExists: false,
    profile: toProfileResponse(created),
  };
}

export async function createProfileService(
  env: WorkerEnv,
  body: unknown,
): Promise<ProfileResponse> {
  const parsed = validateCreateProfileInput(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const status = issue?.code === "invalid_type" ? 422 : 400;

    throw {
      status: "error",
      message: issue?.message ?? "Invalid request body",
      code: status,
    };
  }

  const result = await createOrGetProfile(env, parsed.data.name);
  return result.profile;
}

export async function getProfileByIdService(
  env: WorkerEnv,
  id: string,
): Promise<ProfileResponse | undefined> {
  const profile = await findProfileById(env, id);
  return profile ? toProfileResponse(profile) : undefined;
}

export async function listProfilesService(
  env: WorkerEnv,
  filters: ProfileQueryFilters = {},
  pagination: ProfileListPagination = { page: 1, limit: 10 },
  sort: ProfileListSort = {},
  baseUrl: string = "/api/profiles",
): Promise<ProfileListResponse> {
  const result = await listProfiles(env, filters, pagination, sort);
  const data = result.data.map(toProfileResponse);

  const totalPages = Math.ceil(result.total / result.limit);

  const buildLink = (p: number) => {
    const url = new URL(baseUrl, "http://localhost"); // base doesn't matter for query params
    url.searchParams.set("page", String(p));
    url.searchParams.set("limit", String(result.limit));
    // Add filters/sort if needed, but the requirement only shows page/limit in example
    return `${url.pathname}${url.search}`;
  };

  return {
    status: "success",
    page: result.page,
    limit: result.limit,
    total: result.total,
    total_pages: totalPages,
    links: {
      self: buildLink(result.page),
      next: result.page < totalPages ? buildLink(result.page + 1) : null,
      prev: result.page > 1 ? buildLink(result.page - 1) : null,
    },
    data,
  };
}

export async function deleteProfileService(
  env: WorkerEnv,
  id: string,
): Promise<boolean> {
  return deleteProfileById(env, id);
}

export async function exportProfilesCsvService(
  env: WorkerEnv,
  filters: ProfileQueryFilters = {},
  sort: ProfileListSort = {},
): Promise<string> {
  const result = await listProfiles(
    env,
    filters,
    { page: 1, limit: 10000 },
    sort,
  );

  const headers = [
    "id",
    "name",
    "gender",
    "gender_probability",
    "age",
    "age_group",
    "country_id",
    "country_name",
    "country_probability",
    "created_at",
  ];

  const rows = result.data.map((p) =>
    [
      p.id,
      p.name,
      p.gender,
      p.genderProbability,
      p.age,
      p.ageGroup,
      p.countryId,
      p.countryName,
      p.countryProbability,
      p.createdAt,
    ].join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
