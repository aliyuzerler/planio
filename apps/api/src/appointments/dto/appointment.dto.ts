import { Transform, Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  IsInt,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

const statuses = ["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID("4")
  customerId!: string;

  @ApiProperty()
  @IsUUID("4")
  staffId!: string;

  @ApiProperty()
  @IsUUID("4")
  serviceId!: string;

  @ApiProperty({ example: "2026-09-10T10:00:00.000Z" })
  @Transform(trim)
  @IsString()
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/,
  )
  startAt!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  resourceId?: string | null;

  @ApiPropertyOptional({ enum: ["DEPOSIT", "FULL", "ON_DAY"] })
  @IsOptional()
  @IsIn(["DEPOSIT", "FULL", "ON_DAY"])
  paymentPlan?: "DEPOSIT" | "FULL" | "ON_DAY";

  @ApiPropertyOptional({ nullable: true, example: "150.00" })
  @Transform(trim)
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @Matches(/^\d{1,10}\.\d{2}$/)
  depositAmount?: string | null;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class RescheduleAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  staffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  serviceId?: string;

  @ApiPropertyOptional({ example: "2026-09-10T11:00:00.000Z" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/,
  )
  startAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  resourceId?: string | null;
}

export class ListAppointmentsQueryDto {
  @ApiPropertyOptional({ example: "2026-09-10" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiPropertyOptional({ example: "2026-09-08" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ example: "2026-09-14" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  staffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  customerId?: string;

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsEnum(statuses)
  status?: (typeof statuses)[number];

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
