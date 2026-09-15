import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { ApiEnv } from "@xenior/config";
import type { AuthenticatedUser } from "../common/interfaces/authenticated-user.interface";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import {
  TOKEN_AUDIENCE,
  TOKEN_ISSUER,
  type AccessTokenPayload,
} from "./token.service";

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<ApiEnv, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_SECRET", { infer: true }),
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      algorithms: ["HS256"],
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.typ !== "access") {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        platformRole: true,
        isActive: true,
      },
    });

    if (!user?.isActive) {
      throw new UnauthorizedException({
        message: "Authentication is no longer valid.",
        code: "ACCOUNT_INACTIVE",
      });
    }

    return {
      userId: user.id,
      email: user.email,
      platformRole: user.platformRole,
    };
  }
}
