export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  smsConsent: boolean;
  whatsappConsent: boolean;
  emailConsent: boolean;
  ledgerBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAppointmentHistoryItem {
  id: string;
  startAt: string;
  endAt: string;
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  serviceNameSnapshot: string;
  serviceDurationSnapshot: number;
  servicePriceSnapshot: string;
  currency: string;
  staff: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  smsConsent?: boolean;
  whatsappConsent?: boolean;
  emailConsent?: boolean;
}

export interface UpdateCustomerInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  smsConsent?: boolean;
  whatsappConsent?: boolean;
  emailConsent?: boolean;
  isActive?: boolean;
}

export interface ListCustomersQuery {
  isActive?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}

export type CustomerFileKind = "KVKK" | "SIGNED_FORM" | "OTHER";

export interface CustomerFileRecord {
  id: string;
  customerId: string;
  kind: CustomerFileKind;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}
