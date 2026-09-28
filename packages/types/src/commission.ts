export type CommissionType = "PERCENT" | "AMOUNT";
export type CommissionSourceType = "APPOINTMENT";

export interface CommissionRuleRecord {
  id: string;
  name: string;
  serviceId: string | null;
  commissionType: CommissionType;
  commissionValue: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommissionRuleInput {
  name: string;
  commissionType: CommissionType;
  commissionValue: string;
  serviceId?: string | null;
  isActive?: boolean;
}

export interface UpdateCommissionRuleInput {
  name?: string;
  commissionType?: CommissionType;
  commissionValue?: string;
  serviceId?: string | null;
  isActive?: boolean;
}

export interface ListCommissionRulesQuery {
  isActive?: boolean;
}

export interface CommissionStaffRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface CommissionEntryRecord {
  id: string;
  staff: CommissionStaffRef;
  appointmentId: string | null;
  ruleId: string | null;
  sourceType: CommissionSourceType;
  sourceId: string;
  staffNameSnapshot: string;
  serviceNameSnapshot: string;
  ruleNameSnapshot: string;
  basisAmount: string;
  commissionType: CommissionType;
  commissionValue: string;
  amount: string;
  currency: string;
  earnedAt: string;
  createdAt: string;
  payoutExpenseId: string | null;
}

export interface ListCommissionEntriesQuery {
  staffId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
