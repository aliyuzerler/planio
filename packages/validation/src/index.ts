import { z } from "zod";
import type { ApiErrorBody } from "@xenior/types";

export const apiErrorBodySchema: z.ZodType<ApiErrorBody> = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  code: z.string(),
  timestamp: z.string(),
  path: z.string(),
  details: z.unknown().optional(),
});

export type { ApiErrorBody } from "@xenior/types";

export {
  authSessionResponseSchema,
  authTokenResponseSchema,
  authUserSchema,
  businessUserRoleSchema,
  currentUserResponseSchema,
  acceptStaffInviteInputSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  refreshTokenInputSchema,
  registerInputSchema,
  registerPendingResponseSchema,
  resetPasswordInputSchema,
  verifyEmailInputSchema,
} from "./auth";
export type {
  LoginInputData,
  RefreshTokenInputData,
  RegisterInputData,
} from "./auth";
export {
  businessProfileSchema,
  currencySchema,
  inviteAccountantInputSchema,
  phoneSchema,
  timezoneSchema,
  updateBusinessInputSchema,
} from "./business";
export {
  assignStaffSpecializationInputSchema,
  createSpecializationInputSchema,
  createStaffInputSchema,
  specializationProfileSchema,
  staffHoursSettingsSchema,
  staffProfileSchema,
  staffSpecializationSchema,
  updateSpecializationInputSchema,
  updateStaffHoursInputSchema,
  updateStaffInputSchema,
} from "./staff";
export {
  createServiceInputSchema,
  normalizeServicePrice,
  servicePriceSchema,
  serviceProfileSchema,
  updateServiceInputSchema,
} from "./service";
export {
  createCustomerInputSchema,
  customerAppointmentHistoryItemSchema,
  customerBirthDateSchema,
  customerFileKindSchema,
  customerFileListSchema,
  customerFileRecordSchema,
  customerProfileSchema,
  paginatedCustomerAppointmentHistorySchema,
  paginatedCustomerSchema,
  updateCustomerInputSchema,
} from "./customer";
export {
  createResourceInputSchema,
  resourceProfileSchema,
  updateResourceInputSchema,
} from "./resource";
export {
  campaignDiscountTypeSchema,
  campaignRecordSchema,
  createCampaignInputSchema,
  priceQuoteSchema,
  updateCampaignInputSchema,
} from "./campaign";
export {
  commissionEntryRecordSchema,
  commissionRuleRecordSchema,
  commissionSourceTypeSchema,
  commissionTypeSchema,
  createCommissionRuleInputSchema,
  listCommissionEntriesQuerySchema,
  paginatedCommissionEntrySchema,
  updateCommissionRuleInputSchema,
} from "./commission";
export {
  cashAccountRecordSchema,
  cashAccountTypeSchema,
  createCashAccountInputSchema,
  createCollectionInputSchema,
  createCounterSaleInputSchema,
  createExpenseInputSchema,
  expenseCategorySchema,
  expenseRecordSchema,
  ledgerCustomerRecordSchema,
  ledgerEntryRecordSchema,
  ledgerEntryTypeSchema,
  listExpensesQuerySchema,
  listLedgerEntriesQuerySchema,
  listSalesQuerySchema,
  paginatedExpenseSchema,
  paginatedLedgerEntrySchema,
  paginatedSaleSchema,
  saleRecordSchema,
  saleSourceSchema,
  saleStatusSchema,
  salesReceiptRecordSchema,
  updateCashAccountInputSchema,
} from "./ledger";
export {
  appointmentEventItemSchema,
  appointmentEventTypeSchema,
  appointmentPaymentPlanSchema,
  appointmentPaymentStatusSchema,
  appointmentRecordSchema,
  appointmentStartAtSchema,
  appointmentStatusSchema,
  createAppointmentInputSchema,
  listAppointmentsQuerySchema,
  paginatedAppointmentSchema,
  rescheduleAppointmentInputSchema,
  updateAppointmentInputSchema,
} from "./appointment";
export {
  checkoutIntentStatusSchema,
  checkoutPurposeSchema,
  paymentLinkRecordSchema,
  publicCheckoutRecordSchema,
  tenantPaymentSettingsRecordSchema,
  tenantPosProviderSchema,
  upsertTenantPaymentSettingsInputSchema,
} from "./checkout";
export {
  broadcastSmsInputSchema,
  broadcastSmsResultSchema,
  issueOfficialDocumentInputSchema,
  officialDocumentRecordSchema,
  officialDocumentStatusSchema,
  officialDocumentTypeSchema,
  tenantUyumsoftSettingsRecordSchema,
  upsertTenantUyumsoftSettingsInputSchema,
  uyumsoftProviderSchema,
} from "./invoicing";
export {
  financeSummaryReportSchema,
  listReportsQuerySchema,
  listTenantAuditLogsQuerySchema,
  paginatedTenantAuditLogSchema,
  tenantAuditLogItemSchema,
} from "./reports";
export {
  listNotificationsQuerySchema,
  paginatedNotificationSchema,
  notificationChannelSchema,
  notificationRecordSchema,
  notificationSettingsSchema,
  notificationStatusSchema,
  notificationTypeSchema,
  pushPlatformSchema,
  registerPushDeviceInputSchema,
  notificationChannelSetupSchema,
  testNotificationChannelInputSchema,
  updateBusinessHoursInputSchema,
  businessHoursSettingsSchema,
  dataExportRecordSchema,
  dataRequestRecordSchema,
  updateNotificationSettingsInputSchema,
  upsertNotificationChannelInputSchema,
} from "./notification";
export {
  adminAuditLogItemSchema,
  adminBusinessDetailSchema,
  adminBusinessListItemSchema,
  adminBusinessUserSchema,
  adminDashboardMetricsSchema,
  adminSubscriptionSummarySchema,
  businessStatusSchema,
  createAdminPlanInputSchema,
  paginatedAdminAuditLogsSchema,
  paginatedAdminBusinessesSchema,
  paginatedAdminSubscriptionsSchema,
  updateAdminBusinessStatusInputSchema,
  updateAdminPlanInputSchema,
} from "./admin";
export {
  billingPeriodSchema,
  createPaymentCheckoutInputSchema,
  paymentBillingAddressSchema,
  paymentCheckoutSessionSchema,
  paymentRecordSchema,
  paymentStatusSchema,
  planLimitsSchema,
  planRecordSchema,
  selectSubscriptionPlanInputSchema,
  subscriptionAccessSchema,
  subscriptionRecordSchema,
  subscriptionStatusSchema,
} from "./subscription";
