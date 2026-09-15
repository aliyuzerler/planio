import type { PlatformRole } from "@xenior/types";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  platformRole: PlatformRole;
}
