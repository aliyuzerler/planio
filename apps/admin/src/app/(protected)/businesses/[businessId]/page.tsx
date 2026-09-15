"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@xenior/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { useToast } from "@/components/ui/toast";
import {
  useAdminBusiness,
  useUpdateAdminBusinessStatus,
} from "@/lib/admin/admin-queries";
import {
  BILLING_PERIOD_LABELS,
  BUSINESS_STATUS_LABELS,
  formatDateTime,
  PAYMENT_STATUS_LABELS,
  ROLE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/admin/labels";
import { AppError } from "@/lib/api/errors";
import type { BusinessStatus } from "@xenior/types";

export default function AdminBusinessDetailPage() {
  const params = useParams<{ businessId: string }>();
  const businessId = params.businessId;
  const detail = useAdminBusiness(businessId);
  const updateStatus = useUpdateAdminBusinessStatus(businessId);
  const { pushToast } = useToast();
  const [nextStatus, setNextStatus] = useState<BusinessStatus | null>(null);

  return (
    <PageFrame width="lg">
      <QueryState
        isLoading={detail.isLoading}
        isError={detail.isError}
        loading="İşletme yükleniyor…"
        error="İşletme bilgileri yüklenemedi."
      >
        {detail.data ? (
          <>
            <PageHeader
              title={detail.data.name}
              description={`${detail.data.timezone} · ${detail.data.currency}`}
              actions={
                <div className="flex flex-wrap gap-2">
                  {detail.data.status !== "SUSPENDED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNextStatus("SUSPENDED")}
                    >
                      Askıya al
                    </Button>
                  ) : null}
                  {detail.data.status !== "CLOSED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNextStatus("CLOSED")}
                    >
                      Kapat
                    </Button>
                  ) : null}
                  {detail.data.status !== "ACTIVE" ? (
                    <Button type="button" onClick={() => setNextStatus("ACTIVE")}>
                      Yeniden aç
                    </Button>
                  ) : null}
                </div>
              }
            />

            <section className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoCard label="Durum" value={BUSINESS_STATUS_LABELS[detail.data.status]} />
              <InfoCard label="Telefon" value={detail.data.phone ?? "—"} />
              <InfoCard label="E-posta" value={detail.data.email ?? "—"} />
              <InfoCard label="Adres" value={detail.data.address ?? "—"} />
            </section>
            {detail.data.status === "SUSPENDED" ||
            detail.data.status === "CLOSED" ||
            !detail.data.subscription ||
            detail.data.subscription.status === "EXPIRED" ? (
              <p
                role="status"
                className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
              >
                {!detail.data.subscription ||
                detail.data.subscription.status === "EXPIRED"
                  ? "Lisans süresi dolmuş veya abonelik yok. Kiracı yazma işlemleri kilitlenir."
                  : "İşletme askıda veya kapalı."}
              </p>
            ) : null}

            <section className="mt-8">
              <h2 className="text-lg font-semibold">Abonelik</h2>
              {detail.data.subscription ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    label="Plan"
                    value={`${detail.data.subscription.plan.name} · ${BILLING_PERIOD_LABELS[detail.data.subscription.billingPeriod]}`}
                  />
                  <InfoCard
                    label="Durum"
                    value={SUBSCRIPTION_STATUS_LABELS[detail.data.subscription.status]}
                  />
                  <InfoCard
                    label="Dönem"
                    value={`${formatDateTime(detail.data.subscription.currentPeriodStart)} – ${formatDateTime(detail.data.subscription.currentPeriodEnd)}`}
                  />
                  <InfoCard
                    label="Son ödeme"
                    value={
                      detail.data.subscription.lastPayment
                        ? `${PAYMENT_STATUS_LABELS[detail.data.subscription.lastPayment.status]} · ${detail.data.subscription.lastPayment.amount} ${detail.data.subscription.lastPayment.currency}`
                        : "Ödeme kaydı yok"
                    }
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-600">Abonelik kaydı yok.</p>
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-semibold">İşletme kullanıcıları</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Roller yalnızca görüntülenir. Bu panel rol yükseltmez.
              </p>
              <DataTable caption="İşletme kullanıcıları">
                <DataTableHead>
                  <DataTableRow>
                    <DataTableHeaderCell>Kullanıcı</DataTableHeaderCell>
                    <DataTableHeaderCell>İşletme rolü</DataTableHeaderCell>
                    <DataTableHeaderCell>Platform</DataTableHeaderCell>
                    <DataTableHeaderCell>Üyelik</DataTableHeaderCell>
                  </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                  {detail.data.users.map((user) => (
                    <DataTableRow key={user.membershipId}>
                      <DataTableCell>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-xs text-zinc-500">
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                        </p>
                      </DataTableCell>
                      <DataTableCell>{ROLE_LABELS[user.role]}</DataTableCell>
                      <DataTableCell>{user.platformRole}</DataTableCell>
                      <DataTableCell>{user.isActive ? "Aktif" : "Pasif"}</DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </section>

            <ConfirmDialog
              open={nextStatus !== null}
              title="İşletme durumunu değiştir"
              description={
                nextStatus
                  ? `Durum ${BUSINESS_STATUS_LABELS[nextStatus]} olarak güncellenecek.`
                  : ""
              }
              pending={updateStatus.isPending}
              onCancel={() => setNextStatus(null)}
              onConfirm={() => {
                if (!nextStatus) return;
                updateStatus.mutate(nextStatus, {
                  onSuccess: () => {
                    pushToast("İşletme durumu güncellendi.");
                    setNextStatus(null);
                  },
                  onError: (error) => {
                    pushToast(
                      error instanceof AppError
                        ? error.message
                        : "Durum güncellenemedi.",
                      "error",
                    );
                  },
                });
              }}
            />
          </>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </article>
  );
}
