import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const BILLING_PERIODS = ["MONTHLY", "SEMIANNUAL", "YEARLY"] as const;

const emptyToUndefined = ({ value }: { value: unknown }): unknown =>
  value === "" ? undefined : value;
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateAdminPlanDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: BILLING_PERIODS })
  @IsEnum(BILLING_PERIODS)
  billingPeriod!: (typeof BILLING_PERIODS)[number];

  @ApiProperty({ example: "2495.00" })
  @IsString()
  @Matches(/^\d{1,10}\.\d{2}$/)
  price!: string;

  @ApiPropertyOptional({ example: "TRY" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  limits?: {
    maxStaff?: number | null;
    maxCustomers?: number | null;
    advancedFeatures?: boolean;
  };

  @ApiPropertyOptional({ nullable: true, maxLength: 191 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(191)
  externalPricingPlanCode?: string | null;
}

export class UpdateAdminPlanDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: BILLING_PERIODS })
  @IsOptional()
  @IsEnum(BILLING_PERIODS)
  billingPeriod?: (typeof BILLING_PERIODS)[number];

  @ApiPropertyOptional({ example: "2495.00" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}\.\d{2}$/)
  price?: string;

  @ApiPropertyOptional({ example: "TRY" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  limits?: {
    maxStaff?: number | null;
    maxCustomers?: number | null;
    advancedFeatures?: boolean;
  };

  @ApiPropertyOptional({ nullable: true, maxLength: 191 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(191)
  externalPricingPlanCode?: string | null;
}

export class UpdateAdminBusinessStatusDto {
  @ApiProperty({ enum: ["ACTIVE", "SUSPENDED", "CLOSED"] })
  @IsEnum(["ACTIVE", "SUSPENDED", "CLOSED"])
  status!: "ACTIVE" | "SUSPENDED" | "CLOSED";
}

export class ListAdminBusinessesQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "SUSPENDED", "CLOSED"] })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(["ACTIVE", "SUSPENDED", "CLOSED"])
  status?: "ACTIVE" | "SUSPENDED" | "CLOSED";

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize = 25;
}

export class ListAdminSubscriptionsQueryDto {
  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID("4")
  businessId?: string;

  @ApiPropertyOptional({
    enum: ["TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "EXPIRED"],
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(["TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "EXPIRED"])
  status?:
    | "TRIALING"
    | "ACTIVE"
    | "PAST_DUE"
    | "PAUSED"
    | "CANCELLED"
    | "EXPIRED";

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize = 25;
}

export class ListAdminAuditLogsQueryDto {
  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID("4")
  businessId?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID("4")
  userId?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  entityType?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID("4")
  entityId?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize = 25;
}
