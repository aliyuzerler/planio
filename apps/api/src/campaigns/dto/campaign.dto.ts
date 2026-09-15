import { Transform, Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { CampaignDiscountType } from "@xenior/types";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateCampaignDto {
  @ApiProperty({ maxLength: 160 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ enum: ["PERCENT", "AMOUNT"] })
  @IsIn(["PERCENT", "AMOUNT"])
  discountType!: CampaignDiscountType;

  @ApiProperty({ example: "20.00" })
  @IsString()
  @Matches(/^\d{1,10}\.\d{2}$/)
  discountValue!: string;

  @ApiProperty({ example: "2033-06-01T00:00:00.000Z" })
  @Transform(trim)
  @IsString()
  startsAt!: string;

  @ApiProperty({ example: "2033-06-30T23:59:59.000Z" })
  @Transform(trim)
  @IsString()
  endsAt!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  serviceIds?: string[];

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  smsTemplate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ enum: ["PERCENT", "AMOUNT"] })
  @IsOptional()
  @IsIn(["PERCENT", "AMOUNT"])
  discountType?: CampaignDiscountType;

  @ApiPropertyOptional({ example: "20.00" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}\.\d{2}$/)
  discountValue?: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  serviceIds?: string[];

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  smsTemplate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListCampaignsQueryDto {
  @ApiPropertyOptional()
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PriceQuoteQueryDto {
  @ApiProperty()
  @IsUUID("4")
  serviceId!: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Type(() => String)
  at?: string;
}

export class BroadcastSmsDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body?: string;
}
