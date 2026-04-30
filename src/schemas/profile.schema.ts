import { z } from "@hono/zod-openapi";

export const genderSchema = z.enum(["male", "female"]).openapi({
  example: "female",
});
export const ageGroupSchema = z.enum(["child", "teenager", "adult", "senior"]).openapi({
  example: "adult",
});
export const sortBySchema = z.enum(["created_at", "age", "gender_probability"]).openapi({
  example: "created_at",
});
export const sortOrderSchema = z.enum(["asc", "desc"]).openapi({
  example: "desc",
});

export const createProfileRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").openapi({
    example: "Harriet Tubman",
  }),
});

export const profileParamsSchema = z.object({
  id: z.string().uuid("Invalid profile id").openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "018f2d5e-7b3b-7b3b-7b3b-7b3b7b3b7b3b",
  }),
});

export const profileQuerySchema = z.object({
  gender: genderSchema.optional(),
  country_id: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "country_id must be a 2-letter country code")
    .optional()
    .openapi({
      example: "US",
    }),
  age_group: ageGroupSchema.optional(),
  min_age: z.coerce.number().int().min(0).max(150).optional().openapi({
    example: 18,
  }),
  max_age: z.coerce.number().int().min(0).max(150).optional().openapi({
    example: 65,
  }),
  min_gender_probability: z.coerce.number().min(0).max(1).optional().openapi({
    example: 0.9,
  }),
  min_country_probability: z.coerce.number().min(0).max(1).optional().openapi({
    example: 0.9,
  }),
  page: z.coerce.number().int().min(1).default(1).openapi({
    example: 1,
  }),
  limit: z.coerce.number().int().min(1).default(10).openapi({
    example: 10,
  }),
  sort_by: sortBySchema.default("created_at"),
  order: sortOrderSchema.default("desc"),
  q: z.string().trim().min(1).optional().openapi({
    example: "Harriet",
  }),
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
}).openapi("Profile");

export const profileListItemSchema = profileSchema;

export const profileResponseSchema = z.object({
  status: z.string().openapi({ example: "success" }),
  data: profileSchema,
});

export const profileListResponseSchema = z.object({
  status: z.string().openapi({ example: "success" }),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  total_pages: z.number(),
  links: z.object({
    self: z.string(),
    next: z.string().nullable(),
    prev: z.string().nullable(),
  }),
  data: z.array(profileListItemSchema),
});

export const errorResponseSchema = z.object({
  status: z.string().openapi({ example: "error" }),
  message: z.string().openapi({ example: "Error message" }),
});

export type CreateProfileRequest = z.infer<typeof createProfileRequestSchema>;
export type ProfileParams = z.infer<typeof profileParamsSchema>;
export type ProfileQuery = z.infer<typeof profileQuerySchema>;
export type Profile = z.infer<typeof profileSchema>;
export type ProfileListItem = z.infer<typeof profileListItemSchema>;
