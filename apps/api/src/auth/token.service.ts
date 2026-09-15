import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { ApiEnv } from "@xenior/config";
import type { Prisma } from "@xenior/database";
import type {
  AuthTokenResponse,
  AuthUser,
  PlatformRole,
} from "@xenior/types";
import { PrismaService } from "../infrastructure/prisma/prisma.service";

const TOKEN_ISSUER = "xenior-api";
const TOKEN_AUDIENCE = "xenior-clients";
const ROTATION_RETRY_GRACE_MS = 10_000;

type TokenDatabase = Pick<Prisma.TransactionClient, "refreshToken">;

interface TokenUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  platformRole: PlatformRole;
  isActive: boolean;
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  platformRole: PlatformRole;
  typ: "access";
}

interface RotatedSession {
  tokens: AuthTokenResponse;
  user: AuthUser;
}

class RotationRaceError extends Error {}

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async issueSession(
    user: TokenUser,
    database: TokenDatabase = this.prisma,
    familyId = randomUUID(),
  ): Promise<AuthTokenResponse> {
    const refreshToken = this.createOpaqueToken();
    const refreshTtl = this.config.get("JWT_REFRESH_TTL_SECONDS", {
      infer: true,
    });

    await database.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1_000),
      },
    });

    return this.buildTokenResponse(user, refreshToken);
  }

  async rotate(refreshToken: string): Promise<RotatedSession> {
    const now = new Date();
    const tokenHash = this.hashRefreshToken(refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing) {
      throw this.invalidRefreshToken();
    }

    if (existing.revokedAt) {
      await this.handleRevokedToken(existing);
      throw this.invalidRefreshToken(
        existing.revokedReason === "ROTATED"
          ? "REFRESH_TOKEN_REUSED"
          : "INVALID_REFRESH_TOKEN",
      );
    }

    if (existing.expiresAt <= now) {
      await this.prisma.refreshToken.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: now, revokedReason: "EXPIRED" },
      });
      throw this.invalidRefreshToken();
    }

    if (!existing.user.isActive) {
      await this.revokeFamily(existing.familyId, "USER_INACTIVE");
      throw new UnauthorizedException({
        message: "Account is inactive.",
        code: "ACCOUNT_INACTIVE",
      });
    }

    let nextRefreshToken: string;
    try {
      nextRefreshToken = await this.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.refreshToken.updateMany({
          where: {
            id: existing.id,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: { revokedAt: now, revokedReason: "ROTATED" },
        });

        if (claimed.count !== 1) {
          throw new RotationRaceError();
        }

        const rawToken = this.createOpaqueToken();
        const refreshTtl = this.config.get("JWT_REFRESH_TTL_SECONDS", {
          infer: true,
        });
        const replacement = await transaction.refreshToken.create({
          data: {
            userId: existing.userId,
            familyId: existing.familyId,
            tokenHash: this.hashRefreshToken(rawToken),
            expiresAt: new Date(Date.now() + refreshTtl * 1_000),
          },
        });

        await transaction.refreshToken.update({
          where: { id: existing.id },
          data: { replacedByTokenId: replacement.id },
        });

        return rawToken;
      });
    } catch (error) {
      if (error instanceof RotationRaceError) {
        const latest = await this.prisma.refreshToken.findUnique({
          where: { id: existing.id },
        });
        if (latest?.revokedAt) {
          await this.handleRevokedToken(latest);
        }
        throw this.invalidRefreshToken();
      }
      throw error;
    }

    return {
      tokens: await this.buildTokenResponse(existing.user, nextRefreshToken),
      user: this.toAuthUser(existing.user),
    };
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "PASSWORD_RESET" },
    });
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: "LOGOUT",
      },
    });
  }

  private async buildTokenResponse(
    user: TokenUser,
    refreshToken: string,
  ): Promise<AuthTokenResponse> {
    const accessTtl = this.config.get("JWT_ACCESS_TTL_SECONDS", {
      infer: true,
    });
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      platformRole: user.platformRole,
      typ: "access",
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get("JWT_SECRET", { infer: true }),
      expiresIn: accessTtl,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      tokenType: "Bearer",
    };
  }

  private async handleRevokedToken(token: {
    familyId: string;
    revokedAt: Date | null;
    revokedReason: string | null;
  }): Promise<void> {
    if (
      token.revokedReason === "ROTATED" &&
      token.revokedAt &&
      Date.now() - token.revokedAt.getTime() <= ROTATION_RETRY_GRACE_MS
    ) {
      return;
    }

    await this.revokeFamily(token.familyId, "REUSE_DETECTED");
  }

  private async revokeFamily(familyId: string, reason: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  private createOpaqueToken(): string {
    return randomBytes(32).toString("base64url");
  }

  private hashRefreshToken(token: string): string {
    return createHmac(
      "sha256",
      this.config.get("JWT_REFRESH_SECRET", { infer: true }),
    )
      .update(token)
      .digest("hex");
  }

  private toAuthUser(user: TokenUser): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      platformRole: user.platformRole,
    };
  }

  private invalidRefreshToken(code = "INVALID_REFRESH_TOKEN") {
    return new UnauthorizedException({
      message: "Refresh token is invalid or expired.",
      code,
    });
  }
}

export { TOKEN_AUDIENCE, TOKEN_ISSUER };
export type { AccessTokenPayload };
