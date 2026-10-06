import { z } from "zod";
import type {
  CreateResourceInput,
  ResourceProfile,
  UpdateResourceInput,
} from "@xenior/types";

export const resourceProfileSchema: z.ZodType<ResourceProfile> = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createResourceInputSchema: z.ZodType<CreateResourceInput> = z
  .object({
    name: z.string().trim().min(1).max(120),
  })
  .strict();

export const updateResourceInputSchema: z.ZodType<UpdateResourceInput> = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "En az bir kaynak alanı girilmelidir.",
  });
