import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma, User } from "@prisma/client";
import type { ApiEnv } from "@xenior/config";
import type {
  AuthSessionResponse,
  AuthUser,
  CurrentUserResponse,
  RegisterPendingResponse,
} from "@xenior/types";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { MailService } from "../notifications/mail.service";
import {
  renderEmailVerificationEmail,
  renderPasswordResetEmail,
} from "../notifications/email-templates";
import { createAuthTokenValue, hashAuthToken } from "./auth-token";
import {
  AcceptStaffInviteDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/auth-tokens.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<ApiEnv, true>,
    @Optional() private readonly mail?: MailService,
  ) {}

  async register(
    input: RegisterDto,
  ): Promise<AuthSessionResponse | RegisterPendingResponse> {
    const email = this.normalizeEmail(input.email);
    const passwordHash = await this.passwords.hash(input.password);
    const isTest = this.config.get("NODE_ENV", { infer: true }) === "test";

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            email,
            passwordHash,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            // E2E suites register and immediately call protected APIs.
            emailVerifiedAt: isTest ? new Date() : null,
          },
        });
        const business = await transaction.business.create({
          data: {
            name: input.businessName.trim(),
            email,
            phone: input.businessPhone?.trim(),
            timezone: input.timezone?.trim() || "Europe/Istanbul",
          },
        });
        await transaction.businessUser.create({
          data: {
            businessId: business.id,
            userId: user.id,
            role: "BUSINESS_OWNER",
          },
        });
        if (input.privacyAccepted) {
          await transaction.privacyConsent.create({
            data: {
              businessId: business.id,
              userId: user.id,
              kind: "PRIVACY_POLICY",
              source: "register",
            },
          });
          await transaction.business.update({
            where: { id: business.id },
            data: { privacyPolicyAcceptedAt: new Date() },
          });
        }
        const starter = await transaction.plan.findFirst({
          where: { name: "Starter", billingPeriod: "MONTHLY", isActive: true },
        });
        if (starter) {
          const now = new Date();
          await transaction.subscription.create({
            data: {
              businessId: business.id,
              planId: starter.id,
              status: "TRIALING",
              startedAt: now,
              currentPeriodStart: now,
              currentPeriodEnd: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            },
          });
        }

        if (isTest) {
          const tokenResponse = await this.tokens.issueSession(user, transaction);
          return {
            kind: "session" as const,
            session: {
              ...tokenResponse,
              user: this.toAuthUser(user),
            },
          };
        }

        return {
          kind: "pending" as const,
          pending: {
            email,
            requiresEmailVerification: true as const,
          },
          userId: user.id,
          businessId: business.id,
        };
      }).then(async (result) => {
        if (result.kind === "session") {
          return result.session;
        }
        await this.issueAndSendToken({
          purpose: "EMAIL_VERIFICATION",
          email,
          userId: result.userId,
          businessId: result.businessId,
          path: "/verify-email",
        });
        return result.pending;
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          message: "An account with this email already exists.",
          code: "EMAIL_ALREADY_EXISTS",
        });
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthSessionResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(input.email) },
    });
    const passwordMatches = await this.passwords.verifyOrDummy(
      user?.passwordHash,
      input.password,
    );

    if (!user || !passwordMatches) {
      throw this.invalidCredentials();
    }
    if (!user.isActive) {
      throw new UnauthorizedException({
        message: "Account is inactive.",
        code: "ACCOUNT_INACTIVE",
      });
    }
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException({
        message: "Email address must be verified before sign-in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    return {
      ...(await this.tokens.issueSession(user)),
      user: this.toAuthUser(user),
    };
  }

  async refresh(input: RefreshTokenDto): Promise<AuthSessionResponse> {
    const session = await this.tokens.rotate(input.refreshToken);
    return {
      ...session.tokens,
      user: session.user,
    };
  }

  async logout(input: RefreshTokenDto): Promise<void> {
    await this.tokens.revoke(input.refreshToken);
  }

  async forgotPassword(input: ForgotPasswordDto): Promise<void> {
    const email = this.normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.isActive) return;
    await this.issueAndSendToken({
      purpose: "PASSWORD_RESET",
      email,
      userId: user.id,
      path: "/reset-password",
    });
  }

  async resetPassword(input: ResetPasswordDto): Promise<void> {
    const token = await this.consumeToken("PASSWORD_RESET", input.token);
    const passwordHash = await this.passwords.hash(input.password);
    if (!token.userId) {
      throw new BadRequestException({
        message: "Reset token is invalid.",
        code: "INVALID_AUTH_TOKEN",
      });
    }
    await this.prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash },
    });
    await this.tokens.revokeAllForUser(token.userId);
  }

  async verifyEmail(input: VerifyEmailDto): Promise<AuthSessionResponse> {
    const token = await this.consumeToken("EMAIL_VERIFICATION", input.token);
    if (!token.userId) {
      throw new BadRequestException({
        message: "Verification token is invalid.",
        code: "INVALID_AUTH_TOKEN",
      });
    }
    const user = await this.prisma.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: new Date() },
    });
    if (!user.isActive) {
      throw new UnauthorizedException({
        message: "Account is inactive.",
        code: "ACCOUNT_INACTIVE",
      });
    }
    return {
      ...(await this.tokens.issueSession(user)),
      user: this.toAuthUser(user),
    };
  }

  async acceptStaffInvite(input: AcceptStaffInviteDto): Promise<AuthSessionResponse> {
    // Token tüketilmeden önce doğrulamalar yapılır: yanlış parola denemesi
    // daveti yakmasın. Tüketim, işlem (transaction) içinde atomik olarak
    // claimToken ile yapılır; hata olursa geri alınır.
    const token = await this.findValidToken("STAFF_INVITE", input.token);
    const metadata = (token.metadata ?? {}) as {
      staffId?: string;
      role?: string;
      firstName?: string;
      lastName?: string;
    };
    const businessId = token.businessId;
    if (!businessId) {
      throw new BadRequestException({
        message: "Invite token is invalid.",
        code: "INVALID_AUTH_TOKEN",
      });
    }

    const staffId = metadata.staffId;
    if (!staffId) {
      // Legacy accountant invites without a staff profile.
      if (metadata.role === "ACCOUNTANT") {
        return this.acceptAccountantInvite(token, input, metadata);
      }
      throw new BadRequestException({
        message: "Invite token is invalid.",
        code: "INVALID_AUTH_TOKEN",
      });
    }

    const email = this.normalizeEmail(token.email);

    return this.prisma.$transaction(async (transaction) => {
      await this.claimToken(transaction, token.id);

      const staff = await transaction.staff.findFirst({
        where: { id: staffId, businessId },
      });
      if (!staff || !staff.isActive) {
        throw new BadRequestException({
          message: "Staff invite is no longer valid.",
          code: "INVALID_STAFF_INVITE",
        });
      }

      const role =
        staff.loginRole === "ACCOUNTANT" ? "ACCOUNTANT" : "STAFF";

      // Mevcut hesabın parolası davetle üzerine yazılamaz: e-posta kayıtlıysa
      // mevcut parolanın doğrulanması gerekir (hesap ele geçirmeyi önler).
      const user = await this.resolveInvitedUser(transaction, email, input, {
        firstName: staff.firstName,
        lastName: staff.lastName,
      });

      const existing = await transaction.businessUser.findUnique({
        where: { businessId_userId: { businessId, userId: user.id } },
      });
      if (existing && existing.role !== role) {
        throw new ConflictException({
          message: "This email already has a membership in the business.",
          code: "MEMBERSHIP_EXISTS",
        });
      }

      const membership = await transaction.businessUser.upsert({
        where: {
          businessId_userId: { businessId, userId: user.id },
        },
        create: {
          businessId,
          userId: user.id,
          role,
        },
        update: { isActive: true, role },
      });

      await transaction.staff.update({
        where: { id: staff.id },
        data: { businessUserId: membership.id },
      });

      const tokenResponse = await this.tokens.issueSession(user, transaction);
      return {
        ...tokenResponse,
        user: this.toAuthUser(user),
      };
    });
  }

  /**
   * Davet edilen e-posta için kullanıcıyı çözer. Hesap yoksa yeni hesap
   * oluşturulur (password zorunlu). Hesap varsa mevcut parola doğrulanır ve
   * parola/e-posta doğrulama durumu değiştirilmez — davet linki ele geçen
   * biri mevcut hesabın parolasını değiştiremesin diye.
   */
  private async resolveInvitedUser(
    transaction: Prisma.TransactionClient,
    email: string,
    input: AcceptStaffInviteDto,
    defaults: { firstName?: string | null; lastName?: string | null },
  ): Promise<User> {
    const existing = await transaction.user.findUnique({ where: { email } });
    if (existing) {
      if (!input.currentPassword) {
        throw new BadRequestException({
          message:
            "This email already has an account. Sign in with your current password to accept the invite.",
          code: "CURRENT_PASSWORD_REQUIRED",
        });
      }
      // verifyOrDummy: parola hash'i olmayan hesaplarda da sabit süreli
      // doğrulama yapar (zamanlama sızıntısı olmasın).
      const valid = await this.passwords.verifyOrDummy(
        existing.passwordHash,
        input.currentPassword,
      );
      if (!valid) {
        throw new UnauthorizedException({
          message: "Current password is incorrect.",
          code: "INVALID_CREDENTIALS",
        });
      }
      return existing;
    }

    if (!input.password) {
      throw new BadRequestException({
        message: "Password is required to create an account.",
        code: "PASSWORD_REQUIRED",
      });
    }
    const passwordHash = await this.passwords.hash(input.password);
    return transaction.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName?.trim() || defaults.firstName || undefined,
        lastName: input.lastName?.trim() || defaults.lastName || undefined,
        emailVerifiedAt: new Date(),
      },
    });
  }

  private async acceptAccountantInvite(
    token: { id: string; email: string; businessId: string | null },
    input: AcceptStaffInviteDto,
    metadata: { firstName?: string; lastName?: string },
  ): Promise<AuthSessionResponse> {
    const businessId = token.businessId;
    if (!businessId) {
      throw new BadRequestException({
        message: "Invite token is invalid.",
        code: "INVALID_AUTH_TOKEN",
      });
    }
    const email = this.normalizeEmail(token.email);
    const firstName =
      input.firstName?.trim() || metadata.firstName?.trim() || "Muhasebe";
    const lastName =
      input.lastName?.trim() || metadata.lastName?.trim() || "Kullanıcı";

    return this.prisma.$transaction(async (transaction) => {
      await this.claimToken(transaction, token.id);

      const user = await this.resolveInvitedUser(transaction, email, input, {
        firstName,
        lastName,
      });

      const existing = await transaction.businessUser.findUnique({
        where: { businessId_userId: { businessId, userId: user.id } },
      });
      if (existing && existing.role !== "ACCOUNTANT") {
        throw new ConflictException({
          message: "This email already has a membership in the business.",
          code: "MEMBERSHIP_EXISTS",
        });
      }

      await transaction.businessUser.upsert({
        where: { businessId_userId: { businessId, userId: user.id } },
        create: {
          businessId,
          userId: user.id,
          role: "ACCOUNTANT",
        },
        update: { isActive: true, role: "ACCOUNTANT" },
      });

      const tokenResponse = await this.tokens.issueSession(user, transaction);
      return {
        ...tokenResponse,
        user: this.toAuthUser(user),
      };
    });
  }

  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        businessUsers: {
          include: { business: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user?.isActive) {
      throw new UnauthorizedException({
        message: "Authentication is no longer valid.",
        code: "ACCOUNT_INACTIVE",
      });
    }

    return {
      user: this.toAuthUser(user),
      memberships: user.businessUsers.map((membership) => ({
        businessId: membership.businessId,
        businessName: membership.business.name,
        businessStatus: membership.business.status,
        role: membership.role,
        isActive: membership.isActive,
      })),
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    platformRole: "USER" | "SUPER_ADMIN";
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      platformRole: user.platformRole,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    );
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      message: "Invalid email or password.",
      code: "INVALID_CREDENTIALS",
    });
  }

  private async issueAndSendToken(input: {
    purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "STAFF_INVITE";
    email: string;
    userId?: string;
    businessId?: string;
    staffId?: string;
    path: string;
  }): Promise<void> {
    const raw = createAuthTokenValue();
    await this.prisma.authToken.create({
      data: {
        purpose: input.purpose,
        tokenHash: hashAuthToken(raw),
        email: input.email,
        userId: input.userId,
        businessId: input.businessId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: input.staffId ? { staffId: input.staffId } : undefined,
      },
    });
    const baseUrl = this.config.get("WEB_URL", { infer: true });
    const link = `${baseUrl}${input.path}?token=${encodeURIComponent(raw)}`;
    const rendered =
      input.purpose === "PASSWORD_RESET"
        ? renderPasswordResetEmail({
            webUrl: baseUrl,
            resetUrl: link,
            email: input.email,
          })
        : renderEmailVerificationEmail({
            webUrl: baseUrl,
            verifyUrl: link,
            email: input.email,
          });
    await this.mail?.sendBestEffort({
      businessId: input.businessId,
      destination: input.email,
      subject: rendered.subject,
      body: rendered.text,
      html: rendered.html,
    });
  }

  /** Token'ı tüketmeden doğrulayıp döndürür (davet ön kontrolleri için). */
  private async findValidToken(
    purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "STAFF_INVITE",
    rawToken: string,
  ) {
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash: hashAuthToken(rawToken) },
    });
    if (
      !token ||
      token.purpose !== purpose ||
      token.consumedAt ||
      token.expiresAt <= new Date()
    ) {
      throw new BadRequestException({
        message: "This link is invalid or has expired.",
        code: "INVALID_AUTH_TOKEN",
      });
    }
    return token;
  }

  /**
   * Token'ı koşullu updateMany ile atomik olarak tüketir. Eşzamanlı ikinci
   * istek koşuldan geçemeyeceği için tek kullanımlık garanti edilir; hata
   * durumunda dış transaction geri alındığında tüketim de geri alınır.
   */
  private async claimToken(
    transaction: Prisma.TransactionClient,
    tokenId: string,
  ): Promise<void> {
    const claimed = await transaction.authToken.updateMany({
      where: {
        id: tokenId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new BadRequestException({
        message: "This link is invalid or has expired.",
        code: "INVALID_AUTH_TOKEN",
      });
    }
  }

  private async consumeToken(
    purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "STAFF_INVITE",
    rawToken: string,
  ) {
    const token = await this.findValidToken(purpose, rawToken);
    await this.claimToken(this.prisma, token.id);
    return token;
  }
}
