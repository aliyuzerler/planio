import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LoginDto } from "./login.dto";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class RegisterDto extends LoginDto {
  @ApiProperty({ example: "Ada" })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: "Lovelace" })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: "Xenior Beauty" })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  businessName!: string;

  @ApiPropertyOptional({ example: "+905551112233" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  businessPhone?: string;

  @ApiPropertyOptional({ default: "Europe/Istanbul" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  privacyAccepted?: boolean;
}
