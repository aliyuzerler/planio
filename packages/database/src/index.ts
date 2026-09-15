import { PrismaClient } from "@prisma/client";

export { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}
