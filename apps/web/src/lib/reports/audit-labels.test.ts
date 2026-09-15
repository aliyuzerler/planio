import { describe, expect, it } from "vitest";
import {
  auditActionLabel,
  auditEntityLabel,
  formatAuditEntity,
} from "./audit-labels";

describe("audit labels", () => {
  it("maps known actions to Turkish copy", () => {
    expect(auditActionLabel("APPOINTMENT_CANCELLED")).toBe(
      "Randevu iptal edildi",
    );
    expect(auditActionLabel("SALE_CREATED")).toBe("Satış oluşturuldu");
  });

  it("maps known entity types to Turkish nouns", () => {
    expect(auditEntityLabel("Customer")).toBe("Müşteri");
    expect(auditEntityLabel("CashAccount")).toBe("Kasa hesabı");
  });

  it("humanizes unknown codes instead of showing raw SCREAMING_SNAKE", () => {
    expect(auditActionLabel("WIDGET_ARCHIVED")).toBe("Widget archived");
    expect(auditEntityLabel("LedgerEntry")).toBe("Ledger entry");
  });

  it("formats entity column with short reference", () => {
    expect(
      formatAuditEntity(
        "Appointment",
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      ),
    ).toBe("Randevu · ref a1b2c3d4");
  });
});
