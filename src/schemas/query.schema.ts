import { z } from "zod";

export const sortOrderSchema = z.enum(["asc", "desc"]);

export const profileGenderSchema = z.enum(["male", "female"]);

export const ageGroupSchema = z.enum(["child", "teenager", "adult", "senior"]);

export const profileListQuerySchema = z
  .object({
    gender: profileGenderSchema.optional(),
    country_id: z.string().trim().toUpperCase().length(2).optional(),
    age_group: ageGroupSchema.optional(),
    min_age: z.coerce.number().int().min(0).optional(),
    max_age: z.coerce.number().int().min(0).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sort_by: z
      .enum(["created_at", "age", "gender_probability", "country_probability"])
      .default("created_at"),
    order: sortOrderSchema.default("desc"),
    q: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      typeof value.min_age === "number" &&
      typeof value.max_age === "number" &&
      value.min_age > value.max_age
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["min_age"],
        message: "min_age must be less than or equal to max_age",
      });
    }
  });

export const profileIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type ProfileListQuery = z.infer<typeof profileListQuerySchema>;
export type ProfileIdParam = z.infer<typeof profileIdParamSchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;
export type ProfileGender = z.infer<typeof profileGenderSchema>;
export type AgeGroup = z.infer<typeof ageGroupSchema>;
