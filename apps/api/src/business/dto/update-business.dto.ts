import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

@ValidatorConstraint({ name: "isIanaTimezone", async: false })
class IsIanaTimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") return false;
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return "timezone must be a valid IANA timezone";
  }
}

export class UpdateBusinessDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true, example: "+905551112233" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "business@example.com" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  address?: string | null;

  @ApiPropertyOptional({ example: "Europe/Istanbul" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Validate(IsIanaTimezoneConstraint)
  timezone?: string;

  @ApiPropertyOptional({ example: "TRY", minLength: 3, maxLength: 3 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
}
