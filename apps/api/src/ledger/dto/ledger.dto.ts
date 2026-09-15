import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CashAccountType,
  CollectionMethod,
  ExpenseCategory,
  SaleStatus,
} from "@xenior/types";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateCashAccountDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: ["CASH", "BANK"] })
  @IsIn(["CASH", "BANK"])
  type!: CashAccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCashAccountDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: ["CASH", "BANK"] })
  @IsOptional()
  @IsIn(["CASH", "BANK"])
  type?: CashAccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCounterSaleDto {
  @ApiProperty()
  @IsUUID("4")
  customerId!: string;

  @ApiProperty()
  @IsUUID("4")
  serviceId!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  staffId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CreateCollectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  cashAccountId?: string;

  @ApiProperty({ example: "360.00" })
  @IsString()
  @Matches(/^\d{1,10}\.\d{2}$/)
  amount!: string;

  @ApiPropertyOptional({ enum: ["CASH", "CARD", "LINK"] })
  @IsOptional()
  @IsIn(["CASH", "CARD", "LINK"])
  method?: CollectionMethod;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class ListSalesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  staffId?: string;

  @ApiPropertyOptional({ enum: ["OPEN", "SETTLED"] })
  @IsOptional()
  @IsIn(["OPEN", "SETTLED"])
  status?: SaleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

export class CreateExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  cashAccountId?: string;

  @ApiProperty({
    enum: ["RENT", "UTILITY", "MATERIAL", "SALARY", "COMMISSION", "OTHER"],
  })
  @IsIn(["RENT", "UTILITY", "MATERIAL", "SALARY", "COMMISSION", "OTHER"])
  category!: ExpenseCategory;

  @ApiProperty({ example: "50.00" })
  @IsString()
  @Matches(/^\d{1,10}\.\d{2}$/)
  amount!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  staffId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID("4")
  commissionEntryId?: string | null;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  occurredAt?: string;
}

export class ListExpensesQueryDto {
  @ApiPropertyOptional({
    enum: ["RENT", "UTILITY", "MATERIAL", "SALARY", "COMMISSION", "OTHER"],
  })
  @IsOptional()
  @IsIn(["RENT", "UTILITY", "MATERIAL", "SALARY", "COMMISSION", "OTHER"])
  category?: ExpenseCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

export class ListLedgerEntriesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID("4")
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}
