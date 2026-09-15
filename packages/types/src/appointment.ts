export type AppointmentStatus =
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type AppointmentPaymentPlan = "DEPOSIT" | "FULL" | "ON_DAY";
export type AppointmentPaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export type AppointmentEventType =
  | "CREATED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export interface AppointmentParty {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AppointmentServiceRef {
  id: string;
  name: string;
}

export interface AppointmentResourceRef {
  id: string;
  name: string;
}

export interface AppointmentEventItem {
  id: string;
  type: AppointmentEventType;
  previousStartAt: string | null;
  previousEndAt: string | null;
  newStartAt: string | null;
  newEndAt: string | null;
  previousStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus | null;
  createdAt: string;
}

export interface AppointmentRecord {
  id: string;
  customer: AppointmentParty;
  staff: AppointmentParty;
  service: AppointmentServiceRef;
  resource?: AppointmentResourceRef | null;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes: string | null;
  createdByUserId: string;
  serviceNameSnapshot: string;
  serviceDurationSnapshot: number;
  servicePriceSnapshot: string;
  listPriceSnapshot: string;
  discountAmountSnapshot: string;
  campaignId: string | null;
  campaignNameSnapshot: string | null;
  currency: string;
  paymentPlan: AppointmentPaymentPlan;
  depositAmount: string | null;
  paymentStatus: AppointmentPaymentStatus;
  collectedAmount: string;
  remainingAmount: string;
  saleId: string | null;
  createdAt: string;
  updatedAt: string;
  events?: AppointmentEventItem[];
}

export interface CreateAppointmentInput {
  customerId: string;
  staffId: string;
  serviceId: string;
  startAt: string;
  notes?: string | null;
  resourceId?: string | null;
  paymentPlan?: AppointmentPaymentPlan;
  depositAmount?: string | null;
}

export interface UpdateAppointmentInput {
  notes?: string | null;
}

export interface RescheduleAppointmentInput {
  customerId?: string;
  staffId?: string;
  serviceId?: string;
  startAt?: string;
  resourceId?: string | null;
}

export interface ListAppointmentsQuery {
  date?: string;
  from?: string;
  to?: string;
  staffId?: string;
  customerId?: string;
  status?: AppointmentStatus;
  page?: number;
  pageSize?: number;
}
