import type { PrismaService } from "../src/infrastructure/prisma/prisma.service";

/**
 * Deletes tenant-scoped rows in FK-safe order, then businesses and users.
 */
export async function cleanupTenantFixtures(
  prisma: PrismaService,
  businessIds: string[],
  userIds: string[] = [],
): Promise<void> {
  const ids = businessIds.filter(Boolean);
  if (ids.length === 0 && userIds.length === 0) return;

  if (ids.length > 0) {
    const where = { businessId: { in: ids } };

    await prisma.notification.deleteMany({ where });
    await prisma.notificationChannelConfig.deleteMany({ where });
    await prisma.notificationTemplate.deleteMany({ where });
    await prisma.notificationSettings.deleteMany({ where });
    await prisma.pushDevice.deleteMany({ where });

    await prisma.checkoutIntent.deleteMany({ where });
    await prisma.officialDocument.deleteMany({ where });
    await prisma.salesReceipt.deleteMany({ where });
    await prisma.collection.deleteMany({ where });
    await prisma.expense.deleteMany({ where });
    await prisma.customerLedgerEntry.deleteMany({ where });
    await prisma.saleLine.deleteMany({ where });
    await prisma.sale.deleteMany({ where });
    await prisma.cashAccount.deleteMany({ where });

    await prisma.commissionEntry.deleteMany({ where });
    await prisma.commissionRule.deleteMany({ where });
    await prisma.campaignService.deleteMany({ where });
    await prisma.campaign.deleteMany({ where });

    await prisma.appointmentEvent.deleteMany({ where });
    await prisma.appointment.deleteMany({ where });
    await prisma.customerFile.deleteMany({ where });
    await prisma.customer.deleteMany({ where });

    await prisma.staffSpecialization.deleteMany({ where });
    await prisma.staffHours.deleteMany({ where });
    await prisma.staff.deleteMany({ where });
    await prisma.specialization.deleteMany({ where });
    await prisma.resource.deleteMany({ where });
    await prisma.service.deleteMany({ where });

    await prisma.payment.deleteMany({ where });
    await prisma.subscription.deleteMany({ where });
    await prisma.authToken.deleteMany({ where });
    await prisma.tenantPaymentSettings.deleteMany({ where });
    await prisma.tenantUyumsoftSettings.deleteMany({ where });
    await prisma.businessHours.deleteMany({ where });
    await prisma.privacyConsent.deleteMany({ where });
    await prisma.dataRequest.deleteMany({ where });
    await prisma.auditLog.deleteMany({ where });

    await prisma.businessUser.deleteMany({ where });
    await prisma.business.deleteMany({ where: { id: { in: ids } } });
  }

  const users = userIds.filter(Boolean);
  if (users.length > 0) {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: users } } });
    await prisma.pushDevice.deleteMany({ where: { userId: { in: users } } });
    await prisma.authToken.deleteMany({ where: { userId: { in: users } } });
    await prisma.dataRequest.deleteMany({ where: { userId: { in: users } } });
    await prisma.privacyConsent.deleteMany({ where: { userId: { in: users } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.businessUser.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  }
}
