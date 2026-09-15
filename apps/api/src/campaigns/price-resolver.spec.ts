import {
  campaignAppliesToService,
  campaignCoversInstant,
  resolvePrice,
} from "./price-resolver";

describe("price resolver", () => {
  it("returns the list price when no campaign applies", () => {
    expect(resolvePrice("250.00", [])).toEqual({
      listPrice: "250.00",
      discountAmount: "0.00",
      payableAmount: "250.00",
      campaignId: null,
      campaignName: null,
    });
  });

  it("applies a percent discount and never goes below zero", () => {
    expect(
      resolvePrice("250.00", [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Yaz",
          discountType: "PERCENT",
          discountValue: "20.00",
        },
      ]),
    ).toEqual({
      listPrice: "250.00",
      discountAmount: "50.00",
      payableAmount: "200.00",
      campaignId: "11111111-1111-4111-8111-111111111111",
      campaignName: "Yaz",
    });

    expect(
      resolvePrice("80.00", [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Full",
          discountType: "PERCENT",
          discountValue: "100.00",
        },
      ]).payableAmount,
    ).toBe("0.00");
  });

  it("caps an amount discount at the list price and picks the better campaign", () => {
    const better = resolvePrice("250.00", [
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "50 TL",
        discountType: "AMOUNT",
        discountValue: "50.00",
      },
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "80 TL",
        discountType: "AMOUNT",
        discountValue: "80.00",
      },
    ]);
    expect(better).toMatchObject({
      discountAmount: "80.00",
      payableAmount: "170.00",
      campaignName: "80 TL",
    });
    expect(
      resolvePrice("40.00", [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Big",
          discountType: "AMOUNT",
          discountValue: "90.00",
        },
      ]).payableAmount,
    ).toBe("0.00");
  });

  it("treats empty service targets as all services", () => {
    expect(campaignAppliesToService([], "svc")).toBe(true);
    expect(campaignAppliesToService(["svc"], "other")).toBe(false);
  });

  it("includes campaign start and end instants", () => {
    const start = new Date("2033-06-01T00:00:00.000Z");
    const end = new Date("2033-06-30T23:59:59.000Z");
    expect(campaignCoversInstant(start, end, start)).toBe(true);
    expect(campaignCoversInstant(start, end, end)).toBe(true);
    expect(
      campaignCoversInstant(start, end, new Date("2033-07-01T00:00:00.000Z")),
    ).toBe(false);
  });
});
