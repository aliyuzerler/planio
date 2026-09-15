import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

class WeeklyHoursSlotDto {
  @ApiProperty({ minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @ApiProperty({ minimum: 0, maximum: 1440 })
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinutes!: number;

  @ApiProperty({ minimum: 0, maximum: 1440 })
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinutes!: number;

  @ApiProperty()
  @IsBoolean()
  isClosed!: boolean;
}

export class CreateStaffDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ nullable: true, example: "+905551112233" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(normalizeEmail)
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  specializationIds?: string[];
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(normalizeEmail)
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListStaffQueryDto {
  @ApiPropertyOptional()
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class CreateSpecializationDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class UpdateSpecializationDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class ListSpecializationsQueryDto {
  @ApiPropertyOptional()
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignStaffSpecializationDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  specializationId!: string;
}

export class UpdateStaffHoursDto {
  @ApiProperty({ type: [WeeklyHoursSlotDto] })
  @ValidateNested({ each: true })
  @Type(() => WeeklyHoursSlotDto)
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  days!: WeeklyHoursSlotDto[];
}
