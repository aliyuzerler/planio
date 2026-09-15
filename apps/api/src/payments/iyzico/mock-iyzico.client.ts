import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  IyzicoCheckoutResult,
  IyzicoInitializeCheckoutInput,
  IyzicoInitializeCheckoutResult,
  IyzicoSubscriptionPort,
} from "./iyzico.port";

interface StoredCheckout {
  input: IyzicoInitializeCheckoutInput;
  fail: boolean;
}

@Injectable()
export class MockIyzicoClient implements IyzicoSubscriptionPort {
  private readonly checkouts = new Map<string, StoredCheckout>();

  async initializeCheckout(
    input: IyzicoInitializeCheckoutInput,
  ): Promise<IyzicoInitializeCheckoutResult> {
    const token = `mock_${randomBytes(24).toString("base64url")}`;
    this.checkouts.set(token, { input, fail: false });
    return {
      token,
      checkoutFormContent: null,
      paymentPageUrl: `${process.env.WEB_URL ?? "http://localhost:3000"}/settings/subscription?checkoutToken=${token}`,
      tokenExpireTime: 1800,
    };
  }

  async retrieveCheckoutResult(token: string): Promise<IyzicoCheckoutResult> {
    const stored = this.checkouts.get(token);
    if (!stored || token.startsWith("mock-fail-") || stored.fail) {
      return {
        status: "failure",
        conversationId: stored?.input.conversationId ?? null,
        token,
        errorCode: "MOCK_PAYMENT_FAILED",
        errorMessage: "Mock checkout failed.",
        subscriptionStatus: null,
        pricingPlanReferenceCode: stored?.input.pricingPlanReferenceCode ?? null,
        subscriptionReferenceCode: null,
        customerReferenceCode: null,
        startDate: null,
        endDate: null,
      };
    }
    return {
      status: "success",
      conversationId: stored.input.conversationId,
      token,
      errorCode: null,
      errorMessage: null,
      subscriptionStatus: "ACTIVE",
      pricingPlanReferenceCode: stored.input.pricingPlanReferenceCode,
      subscriptionReferenceCode: `sub-${stored.input.conversationId}`,
      customerReferenceCode: `cus-${stored.input.conversationId}`,
      startDate: Date.now(),
      endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
  }

  async cancelSubscription(_subscriptionReferenceCode: string): Promise<void> {
    return;
  }

  failToken(token: string): void {
    const stored = this.checkouts.get(token);
    if (stored) stored.fail = true;
  }
}
