import { createHash, randomBytes } from "node:crypto";

export function createAuthTokenValue(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAuthToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
