import { z } from "zod";
import type {
  AssignStaffSpecializationInput,
  CreateSpecializationInput,
  CreateStaffInput,
  SpecializationProfile,
  StaffHoursSettings,
  StaffProfile,
  StaffSpecialization,
  UpdateSpecializationInput,
  UpdateStaffHoursInput,
  UpdateStaffInput,
} from "@xenior/types";
import { phoneSchema } from "./business";
import { weeklyHoursSlotSchema } from "./notification";

const personNameSchema = z.string().trim().min(1).max(100);
const nullableEmailSchema = z.string().trim().email().max(320).nullable();
const nullableNotesSchema = z.string().trim().max(5000).nullable();

export const staffSpecializationSchema: z.ZodType<StaffSpecialization> =
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    isActive: z.boolean(),
    assignedAt: z.string().datetime(),
  });

export const staffProfileSchema: z.ZodType<StaffProfile> = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  isSelf: z.boolean().optional(),
  specializations: z.array(staffSpecializationSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const specializationProfileSchema: z.ZodType<SpecializationProfile> =
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

export const createStaffInputSchema: z.ZodType<CreateStaffInput> = z
  .object({
    firstName: personNameSchema,
    lastName: personNameSchema,
    phone: phoneSchema.nullable().optional(),
    email: nullableEmailSchema.optional(),
    notes: nullableNotesSchema.optional(),
    specializationIds: z
      .array(z.string().uuid())
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Specialization IDs must be unique.",
      })
      .optional(),
  })
  .strict();

export const updateStaffInputSchema: z.ZodType<UpdateStaffInput> = z
  .object({
    firstName: personNameSchema.optional(),
    lastName: personNameSchema.optional(),
    phone: phoneSchema.nullable().optional(),
    email: nullableEmailSchema.optional(),
    notes: nullableNotesSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one staff field must be provided.",
  });

export const createSpecializationInputSchema: z.ZodType<CreateSpecializationInput> =
  z
    .object({
      name: z.string().trim().min(1).max(120),
    })
    .strict();

export const updateSpecializationInputSchema: z.ZodType<UpdateSpecializationInput> =
  z
    .object({
      isActive: z.boolean(),
    })
    .strict();

export const assignStaffSpecializationInputSchema: z.ZodType<AssignStaffSpecializationInput> =
  z
    .object({
      specializationId: z.string().uuid(),
    })
    .strict();

export const staffHoursSettingsSchema: z.ZodType<StaffHoursSettings> = z.object({
  days: z.array(weeklyHoursSlotSchema).length(7),
});

export const updateStaffHoursInputSchema: z.ZodType<UpdateStaffHoursInput> =
  staffHoursSettingsSchema;
