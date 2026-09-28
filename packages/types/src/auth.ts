export type PlatformRole = "USER" | "SUPER_ADMIN";

export const BUSINESS_USER_ROLES = [
  "BUSINESS_OWNER",
  "BUSINESS_ADMIN",
  "STAFF",
  "ACCOUNTANT",
] as const;

export type BusinessUserRole = (typeof BUSINESS_USER_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  platformRole: PlatformRole;
}

export interface AuthMembership {
  businessId: string;
  businessName: string;
  businessStatus: "ACTIVE" | "SUSPENDED" | "CLOSED";
  role: BusinessUserRole;
  isActive: boolean;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export interface AuthSessionResponse extends AuthTokenResponse {
  user: AuthUser;
}

export interface RegisterPendingResponse {
  email: string;
  requiresEmailVerification: true;
}

export interface CurrentUserResponse {
  user: AuthUser;
  memberships: AuthMembership[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  firstName: string;
  lastName: string;
  businessName: string;
  businessPhone?: string;
  timezone?: string;
  privacyAccepted?: boolean;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface AcceptStaffInviteInput {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}
