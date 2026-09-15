import { Injectable } from "@nestjs/common";
import type { OfficialDocumentType, UyumsoftProvider } from "@xenior/types";

export interface UyumsoftIssueInput {
  type: OfficialDocumentType;
  provider: UyumsoftProvider;
  hasCredentials: boolean;
  sequence: number;
  receiptNo: string;
  saleId: string;
  totalAmount: string;
  currency: string;
}

export interface UyumsoftIssueResult {
  ok: boolean;
  documentNo?: string;
  pdfUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class UyumsoftIssuer {
  issue(input: UyumsoftIssueInput): UyumsoftIssueResult {
    if (input.provider === "UYUMSOFT" && !input.hasCredentials) {
      return {
        ok: false,
        errorCode: "UYUMSOFT_NOT_CONFIGURED",
        errorMessage: "Uyumsoft kimlik bilgisi kaydedilmeden resmi belge kesilemez.",
      };
    }
    const year = new Date().getFullYear();
    const prefix = input.type === "E_FATURA" ? "EF" : "SMM";
    const documentNo = `${prefix}-${year}-${String(input.sequence).padStart(5, "0")}`;
    return {
      ok: true,
      documentNo,
      pdfUrl: `https://sandbox.uyumsoft.local/${documentNo}.pdf`,
    };
  }
}
