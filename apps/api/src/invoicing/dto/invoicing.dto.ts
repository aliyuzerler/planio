import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { OfficialDocumentType, UyumsoftProvider } from "@xenior/types";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class UpsertTenantUyumsoftSettingsDto {
  @ApiProperty({ enum: ["GENERIC", "UYUMSOFT"] })
  @IsIn(["GENERIC", "UYUMSOFT"])
  provider!: UyumsoftProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  username?: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password?: string;
}

export class IssueOfficialDocumentDto {
  @ApiProperty({ enum: ["E_FATURA", "SMM"] })
  @IsIn(["E_FATURA", "SMM"])
  type!: OfficialDocumentType;
}
