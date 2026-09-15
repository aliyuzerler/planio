import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class WeeklyHoursSlotDto {
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

export class UpdateBusinessHoursDto {
  @ApiProperty()
  @IsBoolean()
  hoursEnforced!: boolean;

  @ApiProperty({ type: [WeeklyHoursSlotDto] })
  @ValidateNested({ each: true })
  @Type(() => WeeklyHoursSlotDto)
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  days!: WeeklyHoursSlotDto[];
}
