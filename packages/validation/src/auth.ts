import { z } from "zod";
import type {
  AuthSessionResponse,
  AuthTokenResponse,
  AuthUser,
  CurrentUserResponse,
  RegisterPendingResponse,
} from "@xenior/types";
import { BUSINESS_USER_ROLES } from "@xenior/types";

const emailSchema = z.string().trim().toLowerCase().email().max(320);
const passwordSchema = z.string().min(12).max(128);
const nameSchema = z.string().trim().min(1).max(100);

export const businessUserRoleSchema = z.enum(BUSINESS_USER_ROLES);

export const loginInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerInputSchema = loginInputSchema.extend({
  firstName: nameSchema,
  lastName: nameSchema,
  businessName: z.string().trim().min(2).max(200),
  businessPhone: z.string().trim().min(3).max(32).optional(),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .default("Europe/Istanbul"),
  privacyAccepted: z.boolean().optional(),
});

export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});

export const resetPasswordInputSchema = z.object({
  token: z.string().trim().min(16).max(256),
  password: passwordSchema,
});

export const verifyEmailInputSchema = z.object({
  token: z.string().trim().min(16).max(256),
});

export const acceptStaffInviteInputSchema = z.object({
  token: z.string().trim().min(16).max(256),
  password: passwordSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});

export const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(32).max(256),
});

export const authUserSchema: z.ZodType<AuthUser> = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  platformRole: z.enum(["USER", "SUPER_ADMIN"]),
});

const authTokenResponseObjectSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
  tokenType: z.literal("Bearer"),
});

export const authTokenResponseSchema: z.ZodType<AuthTokenResponse> =
  authTokenResponseObjectSchema;

export const authSessionResponseSchema: z.ZodType<AuthSessionResponse> =
  authTokenResponseObjectSchema.extend({
    user: authUserSchema,
  });

export const registerPendingResponseSchema: z.ZodType<RegisterPendingResponse> =
  z.object({
    email: z.string().email(),
    requiresEmailVerification: z.literal(true),
  });

export const currentUserResponseSchema: z.ZodType<CurrentUserResponse> =
  z.object({
    user: authUserSchema,
    memberships: z.array(
      z.object({
        businessId: z.string().uuid(),
        businessName: z.string(),
        businessStatus: z.enum(["ACTIVE", "SUSPENDED", "CLOSED"]),
        role: businessUserRoleSchema,
        isActive: z.boolean(),
      }),
    ),
  });

export type LoginInputData = z.infer<typeof loginInputSchema>;
export type RegisterInputData = z.infer<typeof registerInputSchema>;
export type RefreshTokenInputData = z.infer<typeof refreshTokenInputSchema>;
