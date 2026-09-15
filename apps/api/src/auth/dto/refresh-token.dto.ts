import { IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty({ minLength: 32, maxLength: 256, writeOnly: true })
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  refreshToken!: string;
}
