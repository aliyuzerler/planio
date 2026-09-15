import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@xenior/config";
import { createIyzicoAuthorizationHeader } from "./iyzico-auth";
import type {
  IyzicoCheckoutResult,
  IyzicoInitializeCheckoutInput,
  IyzicoInitializeCheckoutResult,
  IyzicoSubscriptionPort,
} from "./iyzico.port";

interface IyzicoApiResponse {
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  tokenExpireTime?: number;
  data?: {
    referenceCode?: string;
    customerReferenceCode?: string;
    subscriptionStatus?: string;
    pricingPlanReferenceCode?: string;
    startDate?: number;
    endDate?: number;
  };
}

@Injectable()
export class IyzicoHttpClient implements IyzicoSubscriptionPort {
  constructor(private readonly config: ConfigService<ApiEnv, true>) {}

  async initializeCheckout(
    input: IyzicoInitializeCheckoutInput,
  ): Promise<IyzicoInitializeCheckoutResult> {
    const payload = {
      locale: "tr",
      conversationId: input.conversationId,
      callbackUrl: input.callbackUrl,
      pricingPlanReferenceCode: input.pricingPlanReferenceCode,
      subscriptionInitialStatus: "ACTIVE",
      customer: input.customer,
    };
    const response = await this.request<IyzicoApiResponse>(
      "POST",
      "/v2/subscription/checkoutform/initialize",
      payload,
    );
    this.assertSuccess(response);
    if (!response.token) {
      throw this.providerError("Iyzico checkout token was missing.");
    }
    return {
      token: response.token,
      checkoutFormContent: response.checkoutFormContent ?? null,
      paymentPageUrl: response.paymentPageUrl ?? null,
      tokenExpireTime: response.tokenExpireTime ?? null,
    };
  }

  async retrieveCheckoutResult(token: string): Promise<IyzicoCheckoutResult> {
    const response = await this.request<IyzicoApiResponse>(
      "GET",
      `/v2/subscription/checkoutform/${encodeURIComponent(token)}`,
    );
    return {
      status: response.status === "success" ? "success" : "failure",
      conversationId: response.conversationId ?? null,
      token: response.token ?? token,
      errorCode: response.errorCode ?? null,
      errorMessage: response.errorMessage ?? null,
      subscriptionStatus: response.data?.subscriptionStatus ?? null,
      pricingPlanReferenceCode: response.data?.pricingPlanReferenceCode ?? null,
      subscriptionReferenceCode: response.data?.referenceCode ?? null,
      customerReferenceCode: response.data?.customerReferenceCode ?? null,
      startDate: response.data?.startDate ?? null,
      endDate: response.data?.endDate ?? null,
    };
  }

  async cancelSubscription(subscriptionReferenceCode: string): Promise<void> {
    const response = await this.request<IyzicoApiResponse>(
      "POST",
      `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionReferenceCode)}/cancel`,
      { subscriptionReferenceCode },
    );
    this.assertSuccess(response);
  }

  private async request<T>(
    method: "GET" | "POST",
    uriPath: string,
    payload?: unknown,
  ): Promise<T> {
    const apiKey = this.config.get("IYZICO_API_KEY", { infer: true });
    const secretKey = this.config.get("IYZICO_SECRET_KEY", { infer: true });
    const baseUrl = this.config.get("IYZICO_BASE_URL", { infer: true });
    if (!apiKey || !secretKey) {
      throw this.providerError("iyzico credentials are not configured.");
    }
    const body = payload === undefined ? "" : JSON.stringify(payload);
    const { authorization, randomKey } = createIyzicoAuthorizationHeader({
      apiKey,
      secretKey,
      uriPath,
      body,
    });
    const response = await fetch(`${baseUrl}${uriPath}`, {
      method,
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        "x-iyzi-rnd": randomKey,
      },
      body: method === "GET" ? undefined : body,
    });
    const data = (await response.json().catch(() => ({}))) as T;
    if (!response.ok) {
      throw this.providerError("iyzico request failed.");
    }
    return data;
  }

  private assertSuccess(response: IyzicoApiResponse): void {
    if (response.status !== "success") {
      throw this.providerError(
        response.errorMessage ?? "iyzico returned a failure status.",
        response.errorCode,
      );
    }
  }

  private providerError(message: string, code = "IYZICO_PROVIDER_ERROR") {
    return new ServiceUnavailableException({
      message,
      code,
    });
  }
}
