import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import type { ApiEnv } from "@xenior/config";
import type { PaymentCheckoutSession, PaymentRecord } from "@xenior/types";
import type { Request, Response } from "express";
import { Public } from "../common/decorators/public.decorator";
import { RequireBusinessRoles } from "../authorization/authorization.decorators";
import { CreatePaymentCheckoutDto } from "./dto/payment.dto";
import { PaymentsService } from "./payments.service";

const readers = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF"] as const;
const writers = ["BUSINESS_OWNER", "BUSINESS_ADMIN"] as const;

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiSecurity("business")
  @RequireBusinessRoles(...readers)
  @ApiOperation({ summary: "List recent subscription payments" })
  list(): Promise<PaymentRecord[]> {
    return this.payments.list();
  }

  @Post("checkout")
  @ApiBearerAuth()
  @ApiSecurity("business")
  @RequireBusinessRoles(...writers)
  @ApiOperation({ summary: "Start an iyzico checkout session for a plan" })
  checkout(
    @Body() input: CreatePaymentCheckoutDto,
  ): Promise<PaymentCheckoutSession> {
    return this.payments.startCheckout(input);
  }

  @Public()
  @Post("iyzico/callback")
  @ApiOperation({ summary: "iyzico checkout form callback" })
  async callbackPost(
    @Body() body: Record<string, unknown>,
    @Res() response: Response,
  ): Promise<void> {
    await this.finishCallback(String(body.token ?? ""), response);
  }

  @Public()
  @Get("iyzico/callback")
  @ApiOperation({ summary: "iyzico checkout form callback via query" })
  async callbackGet(
    @Query("token") token: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    await this.finishCallback(token ?? "", response);
  }

  @Public()
  @Post("iyzico/webhooks")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "iyzico webhook receiver" })
  webhooks(
    @Headers("x-iyz-signature-v3") signature: string | undefined,
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ): Promise<{ accepted: true }> {
    const header =
      signature ??
      (typeof request.headers["x-iyz-signature-v3"] === "string"
        ? request.headers["x-iyz-signature-v3"]
        : undefined);
    return this.payments.handleWebhook(header, body);
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiSecurity("business")
  @RequireBusinessRoles(...readers)
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<PaymentRecord> {
    return this.payments.get(id);
  }

  @Post(":id/sync")
  @ApiBearerAuth()
  @ApiSecurity("business")
  @RequireBusinessRoles(...writers)
  @ApiOperation({ summary: "Retrieve and verify checkout result from iyzico" })
  sync(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<PaymentRecord> {
    return this.payments.sync(id);
  }

  private async finishCallback(token: string, response: Response): Promise<void> {
    const webUrl = this.config.get("WEB_URL", { infer: true });
    try {
      if (!isCheckoutToken(token)) {
        response.redirect(`${webUrl}/settings/subscription?payment=invalid`);
        return;
      }
      const payment = await this.payments.completeFromToken(token);
      response.redirect(
        `${webUrl}/settings/subscription?payment=${payment.status === "SUCCEEDED" ? "success" : "failure"}`,
      );
    } catch {
      response.redirect(`${webUrl}/settings/subscription?payment=failure`);
    }
  }
}

function isCheckoutToken(token: string): boolean {
  return token.length >= 16 && token.length <= 512 && /^[\w.-]+$/.test(token);
}
