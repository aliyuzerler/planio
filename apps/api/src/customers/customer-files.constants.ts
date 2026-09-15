import type { CustomerFileKind } from "@xenior/types";

export const CUSTOMER_FILE_MAX_BYTES = 10 * 1024 * 1024;

export const CUSTOMER_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function customerFileExtension(contentType: string): string {
  return EXTENSION_BY_MIME[contentType] ?? "";
}

export function isAllowedCustomerFileType(contentType: string): boolean {
  return CUSTOMER_FILE_MIME_TYPES.has(contentType);
}

export function customerFileStorageKey(input: {
  businessId: string;
  customerId: string;
  fileId: string;
  contentType: string;
}): string {
  return [
    "businesses",
    input.businessId,
    "customers",
    input.customerId,
    `${input.fileId}${customerFileExtension(input.contentType)}`,
  ].join("/");
}

export const CUSTOMER_FILE_KINDS: CustomerFileKind[] = [
  "KVKK",
  "SIGNED_FORM",
  "OTHER",
];
