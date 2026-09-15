import { createIyzicoAuthorizationHeader } from "./iyzico-auth";

describe("iyzico IYZWSv2 authorization", () => {
  it("signs randomKey + uri path + body with HMAC-SHA256", () => {
    const { authorization, randomKey } = createIyzicoAuthorizationHeader({
      apiKey: "sandbox-key",
      secretKey: "sandbox-secret",
      uriPath: "/v2/subscription/checkoutform/initialize",
      body: '{"conversationId":"pay-1"}',
      randomKey: "123456789",
    });
    expect(randomKey).toBe("123456789");
    expect(authorization.startsWith("IYZWSv2 ")).toBe(true);
    const decoded = Buffer.from(authorization.slice("IYZWSv2 ".length), "base64").toString(
      "utf8",
    );
    expect(decoded).toContain("apiKey:sandbox-key");
    expect(decoded).toContain("randomKey:123456789");
    expect(decoded).toContain("signature:");
  });
});
