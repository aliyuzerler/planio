export interface IyzicoCheckoutCustomer {
  name: string;
  surname: string;
  email: string;
  gsmNumber: string;
  identityNumber: string;
  billingAddress: {
    address: string;
    contactName: string;
    city: string;
    country: string;
    zipCode?: string;
  };
}

export interface IyzicoInitializeCheckoutInput {
  conversationId: string;
  callbackUrl: string;
  pricingPlanReferenceCode: string;
  customer: IyzicoCheckoutCustomer;
}

export interface IyzicoInitializeCheckoutResult {
  token: string;
  checkoutFormContent: string | null;
  paymentPageUrl: string | null;
  tokenExpireTime: number | null;
}

export interface IyzicoCheckoutResult {
  status: "success" | "failure";
  conversationId: string | null;
  token: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  subscriptionStatus: string | null;
  pricingPlanReferenceCode: string | null;
  subscriptionReferenceCode: string | null;
  customerReferenceCode: string | null;
  startDate: number | null;
  endDate: number | null;
}

export interface IyzicoSubscriptionPort {
  initializeCheckout(
    input: IyzicoInitializeCheckoutInput,
  ): Promise<IyzicoInitializeCheckoutResult>;
  retrieveCheckoutResult(token: string): Promise<IyzicoCheckoutResult>;
  cancelSubscription(subscriptionReferenceCode: string): Promise<void>;
}

export const IYZICO_SUBSCRIPTION_PORT = Symbol("IYZICO_SUBSCRIPTION_PORT");
