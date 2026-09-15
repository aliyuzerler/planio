import { IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SelectSubscriptionPlanDto {
  @ApiProperty()
  @IsUUID("4")
  planId!: string;
}
