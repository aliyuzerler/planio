import type { Request } from "express";
import type { BusinessUserRole } from "@xenior/types";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";

export interface TenantMembershipContext {
  businessId: string;
  businessUserId: string | null;
  role: BusinessUserRole | null;
  businessStatus: "ACTIVE" | "SUSPENDED" | "CLOSED";
}

export interface RequestAuthorizationContext {
  user: AuthenticatedUser;
  tenant: TenantMembershipContext | null;
  superAdminBypass: boolean;
}

export type AuthorizedRequest = Request & {
  user?: AuthenticatedUser;
  authorization?: RequestAuthorizationContext;
};
