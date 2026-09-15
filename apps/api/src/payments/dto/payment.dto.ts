import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PaymentBillingAddressDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  address!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;
}

export class CreatePaymentCheckoutDto {
  @ApiProperty()
  @IsUUID("4")
  planId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  identityNumber!: string;

  @ApiProperty({ example: "+905551112233" })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/)
  gsmNumber!: string;

  @ApiProperty({ type: PaymentBillingAddressDto })
  @ValidateNested()
  @Type(() => PaymentBillingAddressDto)
  billingAddress!: PaymentBillingAddressDto;
}
