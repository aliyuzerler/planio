export type OfficialDocumentType = "E_FATURA" | "SMM";
export type OfficialDocumentStatus = "PENDING" | "ISSUED" | "FAILED";
export type UyumsoftProvider = "GENERIC" | "UYUMSOFT";

export const OFFICIAL_DOCUMENT_CANCEL_POLICY =
  "Resmi belge Xenior içinden iptal/iade edilemez. İptal Uyumsoft ve GİB kurallarına tabidir; dahili satış fişi durur.";

export interface TenantUyumsoftSettingsRecord {
  provider: UyumsoftProvider;
  isActive: boolean;
  hasCredentials: boolean;
  updatedAt: string;
}

export interface UpsertTenantUyumsoftSettingsInput {
  provider: UyumsoftProvider;
  isActive?: boolean;
  username?: string;
  password?: string;
}

export interface OfficialDocumentRecord {
  id: string;
  saleId: string;
  type: OfficialDocumentType;
  status: OfficialDocumentStatus;
  documentNo: string | null;
  pdfUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  cancelPolicy: string;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueOfficialDocumentInput {
  type: OfficialDocumentType;
}

export interface BroadcastSmsInput {
  body?: string;
}

export interface BroadcastSmsResult {
  queued: number;
  skippedNoConsent: number;
  skippedNoPhone: number;
  skippedOverLimit: number;
  body: string;
}
