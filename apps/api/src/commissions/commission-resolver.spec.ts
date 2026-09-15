import { resolveCommission } from "./commission-resolver";

describe("resolveCommission", () => {
  it("applies a percent rule to the payable basis", () => {
    const resolved = resolveCommission(
      "450.00",
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Manikür %20",
          serviceId: "22222222-2222-4222-8222-222222222222",
          commissionType: "PERCENT",
          commissionValue: "20.00",
        },
      ],
      "22222222-2222-4222-8222-222222222222",
    );
    expect(resolved).toMatchObject({
      amount: "90.00",
      ruleName: "Manikür %20",
    });
  });

  it("prefers a service-specific rule over the default", () => {
    const resolved = resolveCommission(
      "250.00",
      [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          name: "Genel %10",
          serviceId: null,
          commissionType: "PERCENT",
          commissionValue: "10.00",
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          name: "Kesim 50",
          serviceId: "33333333-3333-4333-8333-333333333333",
          commissionType: "AMOUNT",
          commissionValue: "50.00",
        },
      ],
      "33333333-3333-4333-8333-333333333333",
    );
    expect(resolved).toMatchObject({
      amount: "50.00",
      ruleName: "Kesim 50",
    });
  });

  it("returns null when no rule applies", () => {
    expect(
      resolveCommission(
        "250.00",
        [
          {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            name: "Başka hizmet",
            serviceId: "44444444-4444-4444-8444-444444444444",
            commissionType: "PERCENT",
            commissionValue: "15.00",
          },
        ],
        "55555555-5555-4555-8555-555555555555",
      ),
    ).toBeNull();
  });
});
