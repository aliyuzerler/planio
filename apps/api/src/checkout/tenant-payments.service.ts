import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@xenior/config";
import type { TenantPaymentSettingsRecord } from "@xenior/types";
import { encryptSecret } from "../common/crypto/secret-box";
import { RequestContextService } from "../authorization/request-context.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { UpsertTenantPaymentSettingsDto } from "./dto/checkout.dto";

@Injectable()
export class TenantPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async get(): Promise<TenantPaymentSettingsRecord> {
    const { businessId } = this.requestContext.requireTenant();
    const row = await this.prisma.tenantPaymentSettings.findUnique({
      where: { businessId },
    });
    return this.toRecord(row);
  }

  async upsert(
    input: UpsertTenantPaymentSettingsDto,
  ): Promise<TenantPaymentSettingsRecord> {
    const { businessId } = this.requestContext.requireTenant();
    const existing = await this.prisma.tenantPaymentSettings.findUnique({
      where: { businessId },
    });
    const credentialsCipher = this.buildCipher(input, existing?.credentialsCipher);
    const row = await this.prisma.tenantPaymentSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        provider: input.provider,
        isActive: input.isActive ?? false,
        credentialsCipher,
      },
      update: {
        provider: input.provider,
        isActive: input.isActive ?? existing?.isActive ?? false,
        credentialsCipher,
      },
    });
    return this.toRecord(row);
  }

  private buildCipher(
    input: UpsertTenantPaymentSettingsDto,
    previous: string | null | undefined,
  ): string | null {
    if (!input.apiKey && !input.secretKey) return previous ?? null;
    const payload = JSON.stringify({
      apiKey: input.apiKey ?? "",
      secretKey: input.secretKey ?? "",
    });
    return encryptSecret(payload, this.encryptionSecret());
  }

  private encryptionSecret(): string {
    return (
      this.config.get("CREDENTIALS_ENCRYPTION_KEY", { infer: true }) ??
      this.config.get("JWT_SECRET", { infer: true })
    );
  }

  private toRecord(row: {
    provider: TenantPaymentSettingsRecord["provider"];
    isActive: boolean;
    credentialsCipher: string | null;
    updatedAt: Date;
  } | null): TenantPaymentSettingsRecord {
    return {
      provider: row?.provider ?? "GENERIC",
      isActive: row?.isActive ?? false,
      hasCredentials: Boolean(row?.credentialsCipher),
      updatedAt: (row?.updatedAt ?? new Date(0)).toISOString(),
    };
  }
}
