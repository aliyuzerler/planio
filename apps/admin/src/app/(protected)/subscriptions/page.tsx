"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { QueryState } from "@/components/ui/query-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { useAdminSubscriptions } from "@/lib/admin/admin-queries";
import {
  BILLING_PERIOD_LABELS,
  formatDateTime,
  PAYMENT_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/admin/labels";
import type { SubscriptionStatus } from "@xenior/types";

export default function AdminSubscriptionsPage() {
  const [status, setStatus] = useState<"all" | SubscriptionStatus>("all");
  const [page, setPage] = useState(1);
  const subscriptions = useAdminSubscriptions({
    status: status === "all" ? undefined : status,
    page,
    pageSize: 25,
  });

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Abonelikler"
        description="Plan, dönem ve son ödeme durumu veritabanındaki kayıtlardan okunur."
      />
      <div className="mt-6">
        <select
          aria-label="Abonelik durumu"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="all">Tüm durumlar</option>
          <option value="TRIALING">Ödeme bekliyor</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PAST_DUE">Gecikmiş</option>
          <option value="PAUSED">Duraklatıldı</option>
          <option value="CANCELLED">İptal</option>
          <option value="EXPIRED">Süresi doldu</option>
        </select>
      </div>
      <QueryState
        isLoading={subscriptions.isLoading}
        isError={subscriptions.isError}
        isEmpty={subscriptions.data?.items.length === 0}
        loading="Abonelikler yükleniyor…"
        error="Abonelikler yüklenemedi."
        empty="Abonelik kaydı yok."
      >
        {subscriptions.data ? (
          <>
            <p className="mt-4 text-sm text-zinc-600">
              {subscriptions.data.total} kayıt · sayfa {subscriptions.data.page}/
              {Math.max(subscriptions.data.totalPages, 1)}
            </p>
            <DataTable caption="Abonelik listesi">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>İşletme</DataTableHeaderCell>
                  <DataTableHeaderCell>Plan</DataTableHeaderCell>
                  <DataTableHeaderCell>Durum</DataTableHeaderCell>
                  <DataTableHeaderCell>Dönem</DataTableHeaderCell>
                  <DataTableHeaderCell>Ödeme</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {subscriptions.data.items.map((subscription) => (
                  <DataTableRow key={subscription.id}>
                    <DataTableCell>
                      <Link
                        href={`/businesses/${subscription.businessId}`}
                        className="underline"
                      >
                        {subscription.businessName}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>
                      {subscription.plan.name} ·{" "}
                      {BILLING_PERIOD_LABELS[subscription.billingPeriod]}
                    </DataTableCell>
                    <DataTableCell>
                      {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                    </DataTableCell>
                    <DataTableCell>
                      {formatDateTime(subscription.currentPeriodStart)} –{" "}
                      {formatDateTime(subscription.currentPeriodEnd)}
                    </DataTableCell>
                    <DataTableCell>
                      {subscription.lastPayment
                        ? `${PAYMENT_STATUS_LABELS[subscription.lastPayment.status]} · ${subscription.lastPayment.amount} ${subscription.lastPayment.currency}`
                        : "—"}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Önceki
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!subscriptions.data.hasMore}
                onClick={() => setPage((current) => current + 1)}
              >
                Sonraki
              </Button>
            </div>
          </>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}
