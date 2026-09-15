import { sanitizeProviderMetadata } from "./iyzico-metadata";

describe("provider metadata sanitizer", () => {
  it("strips card numbers, CVV and secret credentials", () => {
    expect(
      sanitizeProviderMetadata({
        token: "tok-1",
        cardNumber: "5528790000000008",
        cvc: "123",
        paymentCard: { cardHolderName: "Ada" },
        apiKey: "sandbox-key",
        nested: { expireMonth: "12", status: "SUCCESS" },
      }),
    ).toEqual({
      token: "tok-1",
      nested: { status: "SUCCESS" },
    });
  });
});
