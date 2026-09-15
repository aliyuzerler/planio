export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  code: string;
  timestamp: string;
  path: string;
  details?: unknown;
}

export interface ApiSuccessMeta {
  requestId?: string;
}

export type {
  AuthMembership,
  AuthSessionResponse,
  AuthTokenResponse,
  AuthUser,
  BusinessUserRole,
  CurrentUserResponse,
  LoginInput,
  PlatformRole,
  RefreshTokenInput,
  RegisterInput,
} from "./auth";
export { BUSINESS_USER_ROLES } from "./auth";
export { TENANT_HEADER } from "./authorization";
export type { TenantAuthorizationErrorCode } from "./authorization";
export type {
  BusinessProfile,
  InviteAccountantInput,
  UpdateBusinessInput,
} from "./business";
export type {
  AdminAuditLogItem,
  AdminBusinessDetail,
  AdminBusinessListItem,
  AdminBusinessUser,
  AdminDashboardMetrics,
  AdminPaymentStatusCount,
  AdminPaymentSummary,
  AdminStatusCount,
  AdminSubscriptionStatusCount,
  AdminSubscriptionSummary,
  BusinessStatus,
  ListAdminAuditLogsQuery,
  ListAdminBusinessesQuery,
  ListAdminSubscriptionsQuery,
  PaginatedAdminAuditLogs,
  PaginatedAdminBusinesses,
  PaginatedAdminSubscriptions,
  CreateAdminPlanInput,
  UpdateAdminBusinessStatusInput,
  UpdateAdminPlanInput,
} from "./admin";
export type {
  FinanceSummaryReport,
  ListReportsQuery,
  ListTenantAuditLogsQuery,
  ReportAccountBalance,
  ReportExpenseBucket,
  TenantAuditLogItem,
} from "./reports";
export type {
  AssignStaffSpecializationInput,
  CreateSpecializationInput,
  CreateStaffInput,
  ListStaffQuery,
  SpecializationProfile,
  StaffHoursSettings,
  StaffProfile,
  StaffSpecialization,
  UpdateSpecializationInput,
  UpdateStaffHoursInput,
  UpdateStaffInput,
} from "./staff";
export type {
  CreateServiceInput,
  ListServicesQuery,
  ServiceProfile,
  UpdateServiceInput,
} from "./service";
export type {
  CreateCustomerInput,
  CustomerAppointmentHistoryItem,
  CustomerFileKind,
  CustomerFileRecord,
  CustomerProfile,
  ListCustomersQuery,
  PaginatedResponse,
  UpdateCustomerInput,
} from "./customer";
export type {
  AppointmentEventItem,
  AppointmentEventType,
  AppointmentParty,
  AppointmentPaymentPlan,
  AppointmentPaymentStatus,
  AppointmentRecord,
  AppointmentResourceRef,
  AppointmentServiceRef,
  AppointmentStatus,
  CreateAppointmentInput,
  ListAppointmentsQuery,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
} from "./appointment";
export type {
  CreateResourceInput,
  ListResourcesQuery,
  ResourceProfile,
  UpdateResourceInput,
} from "./resource";
export type {
  AcceptStaffInviteInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth";
export type {
  BusinessHoursSettings,
  DataExportRecord,
  DataRequestRecord,
  ListNotificationsQuery,
  NotificationChannel,
  NotificationChannelSetup,
  NotificationProviderName,
  NotificationRecord,
  NotificationSettings,
  NotificationStatus,
  NotificationType,
  PushDeviceRecord,
  PushPlatform,
  RegisterPushDeviceInput,
  TestNotificationChannelInput,
  UpdateBusinessHoursInput,
  UpdateNotificationSettingsInput,
  UpsertNotificationChannelInput,
  WeeklyHoursSlot,
} from "./notification";
export type {
  CampaignDiscountType,
  CampaignRecord,
  CreateCampaignInput,
  ListCampaignsQuery,
  PriceQuote,
  UpdateCampaignInput,
} from "./campaign";
export type {
  CommissionEntryRecord,
  CommissionSourceType,
  CommissionStaffRef,
  CommissionType,
  CommissionRuleRecord,
  CreateCommissionRuleInput,
  ListCommissionEntriesQuery,
  ListCommissionRulesQuery,
  UpdateCommissionRuleInput,
} from "./commission";
export type {
  CashAccountRecord,
  CashAccountType,
  CollectionMethod,
  CollectionRecord,
  CreateCashAccountInput,
  CreateCollectionInput,
  CreateCounterSaleInput,
  CreateExpenseInput,
  ExpenseCategory,
  ExpenseRecord,
  LedgerCustomerRecord,
  LedgerEntryRecord,
  LedgerEntryType,
  ListExpensesQuery,
  ListLedgerEntriesQuery,
  ListSalesQuery,
  PartyRef,
  SaleLineRecord,
  SaleRecord,
  SaleSource,
  SaleStatus,
  SalesReceiptRecord,
  UpdateCashAccountInput,
} from "./ledger";
export type {
  BroadcastSmsInput,
  BroadcastSmsResult,
  IssueOfficialDocumentInput,
  OfficialDocumentRecord,
  OfficialDocumentStatus,
  OfficialDocumentType,
  TenantUyumsoftSettingsRecord,
  UpsertTenantUyumsoftSettingsInput,
  UyumsoftProvider,
} from "./invoicing";
export { OFFICIAL_DOCUMENT_CANCEL_POLICY } from "./invoicing";
export type {
  CheckoutIntentStatus,
  CheckoutPurpose,
  PaymentLinkRecord,
  PublicCheckoutRecord,
  TenantPaymentSettingsRecord,
  TenantPosProvider,
  UpsertTenantPaymentSettingsInput,
} from "./checkout";
export type {
  BillingPeriod,
  CreatePaymentCheckoutInput,
  PaymentBillingAddress,
  PaymentCheckoutSession,
  PaymentRecord,
  PaymentStatus,
  PlanLimits,
  PlanRecord,
  SelectSubscriptionPlanInput,
  SubscriptionAccess,
  SubscriptionRecord,
  SubscriptionStatus,
  SubscriptionUsage,
} from "./subscription";
