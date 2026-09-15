"use client";

import { useState } from "react";
import type { BillingPeriod, PlanLimits, PlanRecord } from "@xenior/types";
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
import {
  useAdminPlans,
  useCreateAdminPlan,
  useUpdateAdminPlan,
} from "@/lib/admin/admin-queries";
import { BILLING_PERIOD_LABELS } from "@/lib/admin/labels";
import { AppError } from "@/lib/api/errors";

const PERIODS: BillingPeriod[] = ["MONTHLY", "SEMIANNUAL", "YEARLY"];

const emptyLimits: PlanLimits = {
  maxStaff: null,
  maxCustomers: null,
  advancedFeatures: false,
};

export default function AdminPlansPage() {
  const plans = useAdminPlans();

  return (
    <PageFrame width="lg">
      <PageHeader
        title="Planlar"
        description="Fiyat, dönem ve limitler veritabanında tutulur. iyzico kodu eşlenince ödeme o döneme göre tahsil edilir."
      />
      <CreatePlanForm />
      <QueryState
        isLoading={plans.isLoading}
        isError={plans.isError}
        isEmpty={plans.data?.length === 0}
        loading="Planlar yükleniyor…"
        error="Planlar yüklenemedi."
        empty="Plan kaydı yok."
      >
        {plans.data ? (
          <DataTable caption="Plan listesi">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Plan</DataTableHeaderCell>
                <DataTableHeaderCell>Dönem</DataTableHeaderCell>
                <DataTableHeaderCell>Fiyat</DataTableHeaderCell>
                <DataTableHeaderCell>Limitler</DataTableHeaderCell>
                <DataTableHeaderCell>iyzico kodu</DataTableHeaderCell>
                <DataTableHeaderCell>Durum</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {plans.data.map((plan) => (
                <PlanRow key={plan.id} plan={plan} />
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </QueryState>
    </PageFrame>
  );
}

function CreatePlanForm() {
  const mutation = useCreateAdminPlan();
  const [name, setName] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("SEMIANNUAL");
  const [price, setPrice] = useState("");
  const [code, setCode] = useState("");
  const [maxStaff, setMaxStaff] = useState("");
  const [maxCustomers, setMaxCustomers] = useState("");
  const [advancedFeatures, setAdvancedFeatures] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    try {
      await mutation.mutateAsync({
        name,
        billingPeriod,
        price: price.includes(".") ? price : `${price}.00`,
        limits: {
          maxStaff: maxStaff ? Number(maxStaff) : null,
          maxCustomers: maxCustomers ? Number(maxCustomers) : null,
          advancedFeatures,
        },
        externalPricingPlanCode: code.trim() || null,
      });
      setName("");
      setPrice("");
      setCode("");
      setMaxStaff("");
      setMaxCustomers("");
      setAdvancedFeatures(false);
      setMessage("Plan oluşturuldu.");
    } catch (cause) {
      setMessage(cause instanceof AppError ? cause.message : "Plan oluşturulamadı.");
    }
  }

  return (
    <form
      className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h2 className="font-medium">Yeni plan</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1">
          Ad
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="grid gap-1">
          Dönem
          <select
            value={billingPeriod}
            onChange={(event) =>
              setBillingPeriod(event.target.value as BillingPeriod)
            }
            className="rounded-md border border-zinc-300 px-3 py-2"
          >
            {PERIODS.map((period) => (
              <option key={period} value={period}>
                {BILLING_PERIOD_LABELS[period]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Fiyat
          <input
            required
            inputMode="decimal"
            placeholder="2495.00"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="grid gap-1">
          iyzico kodu
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="grid gap-1">
          Max personel
          <input
            inputMode="numeric"
            value={maxStaff}
            onChange={(event) => setMaxStaff(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="grid gap-1">
          Max müşteri
          <input
            inputMode="numeric"
            value={maxCustomers}
            onChange={(event) => setMaxCustomers(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            checked={advancedFeatures}
            onChange={(event) => setAdvancedFeatures(event.target.checked)}
          />
          Gelişmiş özellikler
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Kaydediliyor…" : "Plan oluştur"}
        </Button>
        {message ? <span className="text-xs text-zinc-600">{message}</span> : null}
      </div>
    </form>
  );
}

function PlanRow({ plan }: { plan: PlanRecord }) {
  const mutation = useUpdateAdminPlan();
  const [name, setName] = useState(plan.name);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    plan.billingPeriod,
  );
  const [price, setPrice] = useState(plan.price);
  const [code, setCode] = useState(plan.externalPricingPlanCode ?? "");
  const [isActive, setIsActive] = useState(plan.isActive);
  const [maxStaff, setMaxStaff] = useState(
    plan.limits.maxStaff != null ? String(plan.limits.maxStaff) : "",
  );
  const [maxCustomers, setMaxCustomers] = useState(
    plan.limits.maxCustomers != null ? String(plan.limits.maxCustomers) : "",
  );
  const [advancedFeatures, setAdvancedFeatures] = useState(
    plan.limits.advancedFeatures === true,
  );
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    try {
      await mutation.mutateAsync({
        id: plan.id,
        input: {
          name,
          billingPeriod,
          price,
          isActive,
          limits: {
            ...emptyLimits,
            maxStaff: maxStaff ? Number(maxStaff) : null,
            maxCustomers: maxCustomers ? Number(maxCustomers) : null,
            advancedFeatures,
          },
          externalPricingPlanCode: code.trim() || null,
        },
      });
      setMessage("Kaydedildi.");
    } catch (cause) {
      setMessage(cause instanceof AppError ? cause.message : "Kaydedilemedi.");
    }
  }

  return (
    <DataTableRow>
      <DataTableCell>
        <input
          aria-label={`${plan.name} adı`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-36 rounded-md border border-zinc-300 px-2 py-1 text-sm"
        />
      </DataTableCell>
      <DataTableCell>
        <select
          aria-label={`${plan.name} dönemi`}
          value={billingPeriod}
          onChange={(event) =>
            setBillingPeriod(event.target.value as BillingPeriod)
          }
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
        >
          {PERIODS.map((period) => (
            <option key={period} value={period}>
              {BILLING_PERIOD_LABELS[period]}
            </option>
          ))}
        </select>
      </DataTableCell>
      <DataTableCell>
        <input
          aria-label={`${plan.name} fiyatı`}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm"
        />
      </DataTableCell>
      <DataTableCell>
        <div className="grid min-w-40 gap-1 text-xs">
          <input
            aria-label={`${plan.name} personel limiti`}
            placeholder="Personel"
            value={maxStaff}
            onChange={(event) => setMaxStaff(event.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1"
          />
          <input
            aria-label={`${plan.name} müşteri limiti`}
            placeholder="Müşteri"
            value={maxCustomers}
            onChange={(event) => setMaxCustomers(event.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1"
          />
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={advancedFeatures}
              onChange={(event) => setAdvancedFeatures(event.target.checked)}
            />
            Gelişmiş
          </label>
        </div>
      </DataTableCell>
      <DataTableCell>
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label={`${plan.name} iyzico kodu`}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="min-w-40 rounded-md border border-zinc-300 px-2 py-1 text-sm"
          />
          <Button
            type="button"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => void save()}
          >
            Kaydet
          </Button>
          {message ? <span className="text-xs text-zinc-600">{message}</span> : null}
        </div>
      </DataTableCell>
      <DataTableCell>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          {isActive ? "Aktif" : "Pasif"}
        </label>
      </DataTableCell>
    </DataTableRow>
  );
}
