import { z } from "zod";

export const genderSchema = z.enum(["male", "female"]);
export const ageGroupSchema = z.enum(["child", "teenager", "adult", "senior"]);
export const sortBySchema = z.enum(["created_at", "age", "gender_probability"]);
export const sortOrderSchema = z.enum(["asc", "desc"]);

export const createProfileRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export const profileParamsSchema = z.object({
  id: z.string().uuid("Invalid profile id"),
});

export const profileQuerySchema = z.object({
  gender: genderSchema.optional(),
  country_id: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "country_id must be a 2-letter country code")
    .optional(),
  age_group: ageGroupSchema.optional(),
  min_age: z.coerce.number().int().min(0).max(150).optional(),
  max_age: z.coerce.number().int().min(0).max(150).optional(),
  min_gender_probability: z.coerce.number().min(0).max(1).optional(),
  min_country_probability: z.coerce.number().min(0).max(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
  sort_by: sortBySchema.default("created_at"),
  order: sortOrderSchema.default("desc"),
  q: z.string().trim().min(1).optional(),
});

export const profileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  gender: genderSchema,
  gender_probability: z.number(),
  age: z.number(),
  age_group: ageGroupSchema,
  country_id: z.string(),
  country_name: z.string(),
  country_probability: z.number(),
  created_at: z.string(),
});

// The task requires the list response to contain all properties
export const profileListItemSchema = profileSchema;

export const profileFilterSchema = z.object({
  gender: genderSchema.optional(),
  countryId: z.string().trim().toUpperCase().length(2).optional(),
  ageGroup: ageGroupSchema.optional(),
  minAge: z.coerce.number().int().min(0).max(150).optional(),
  maxAge: z.coerce.number().int().min(0).max(150).optional(),
  minGenderProbability: z.number().min(0).max(1).optional(),
  minCountryProbability: z.number().min(0).max(1).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
});

export type CreateProfileRequest = z.infer<typeof createProfileRequestSchema>;
export type ProfileParams = z.infer<typeof profileParamsSchema>;
export type ProfileQuery = z.infer<typeof profileQuerySchema>;
export type Profile = z.infer<typeof profileSchema>;
export type ProfileListItem = z.infer<typeof profileListItemSchema>;
export type ProfileFilter = z.infer<typeof profileFilterSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
