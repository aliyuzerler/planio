"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, FileText, Receipt } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { AppError } from "@/lib/api/errors";
import { collectSale, issueSaleReceipt } from "@/lib/ledger/ledger-api";
import { issueOfficialDocument } from "@/lib/invoicing/invoicing-api";
import {
  useCanWriteCash,
  useCashAccountList,
  useSaleDetail,
} from "@/lib/ledger/ledger-queries";
import { useAuthStore } from "@/stores/auth-store";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const fieldClass =
  "rounded-xl border-0 bg-[#F7FBFC] px-3 py-2.5 text-[15px] text-[#1e3340] ring-1 ring-[#c5dde6]/80 outline-none transition focus:ring-2 focus:ring-[#7eb8c8]";
const btnPrimary =
  "inline-flex items-center gap-2 rounded-xl bg-[#7eb8c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6aa9bb] disabled:opacity-60";
const btnOutline =
  "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8] disabled:opacity-60";

export default function SaleDetailPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const sale = useSaleDetail(saleId);
  const accounts = useCashAccountList();
  const canWrite = useCanWriteCash();
  const role = useAuthStore((state) =>
    state.memberships.find((item) => item.businessId === state.selectedBusinessId)
      ?.role,
  );
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [documentType, setDocumentType] = useState<"E_FATURA" | "SMM">("SMM");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["sales"] });
    await queryClient.invalidateQueries({ queryKey: ["cash-accounts"] });
    await queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
    await queryClient.invalidateQueries({ queryKey: ["ledger-customers"] });
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
  }

  async function handleCollect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await collectSale(saleId, {
        amount,
        cashAccountId: cashAccountId || undefined,
        method,
      });
      setAmount("");
      setMessage(method === "CARD" ? "POS tahsilatı kaydedildi." : "Nakit tahsilat kaydedildi.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Tahsilat alınamadı.");
    } finally {
      setSaving(false);
    }
  }

  async function handleOfficial() {
    setError(null);
    setSaving(true);
    try {
      const document = await issueOfficialDocument(saleId, { type: documentType });
      setMessage(
        document.status === "ISSUED" && document.documentNo
          ? `Resmi belge kesildi: ${document.documentNo}`
          : document.errorMessage ?? "Resmi belge kesilemedi.",
      );
      await refresh();
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Resmi belge kesilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReceipt() {
    setError(null);
    setSaving(true);
    try {
      await issueSaleReceipt(saleId);
      setMessage("Dahili fiş kesildi.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : "Fiş kesilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (sale.isLoading) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Satış yükleniyor…</p>
      </PageFrame>
    );
  }
  if (sale.isError || !sale.data) {
    return (
      <PageFrame>
        <p role="alert" className="text-sm text-red-700">
          Satış bulunamadı.
        </p>
      </PageFrame>
    );
  }

  const item = sale.data;
  const remaining = item.remainingAmount !== "0.00";

  return (
    <PageFrame width="md" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <Link
        href="/settings/sales"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Satış listesine dön
      </Link>

      <div className="mt-4">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
          Satış kartı
        </p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
          style={displayFont}
        >
          {item.customer.firstName} {item.customer.lastName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-[#eef6f8] px-2.5 py-0.5 text-xs font-semibold text-[#3d6b7a]">
            {item.source === "APPOINTMENT" ? "Randevu satışı" : "Tezgah satışı"}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              item.status === "SETTLED"
                ? "bg-[#b8e6df]/45 text-[#2f5563]"
                : "bg-[#fff8eb] text-[#8a6a2f]"
            }`}
          >
            {item.status === "SETTLED" ? "Kapandı" : "Açık hesap"}
          </span>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#c5dde6]/70 sm:grid-cols-2 sm:p-6">
        <Detail label="Hizmet" value={item.lines[0]?.nameSnapshot ?? "—"} />
        <Detail
          label="Toplam"
          value={`${item.totalAmount} ${item.currency}${
            item.discountAmountSnapshot !== "0.00"
              ? ` · liste ${item.listPriceSnapshot}, indirim ${item.discountAmountSnapshot}`
              : ""
          }`}
        />
        <Detail
          label="Tahsil edilen"
          value={`${item.collectedAmount} ${item.currency}`}
        />
        <Detail
          label="Kalan"
          value={`${item.remainingAmount} ${item.currency}`}
        />
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Resmi belge
          </dt>
          <dd className="mt-1 text-sm text-[#1e3340]">
            {item.officialDocument?.status === "ISSUED" &&
            item.officialDocument.documentNo
              ? `${item.officialDocument.type === "SMM" ? "SMM" : "e-Fatura"} ${item.officialDocument.documentNo}`
              : item.officialDocument?.status === "FAILED"
                ? "Kesilemedi"
                : "Yok · önce dahili fiş gerekir"}
          </dd>
        </div>
      </dl>

      {item.collections.length ? (
        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70">
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Tahsilatlar
            </h2>
          </div>
          <ul className="divide-y divide-[#e4f0f4]">
            {item.collections.map((collection) => (
              <li key={collection.id} className="px-5 py-3 text-sm text-[#1e3340]">
                {collection.amount} {item.currency} ·{" "}
                {collection.method === "CARD"
                  ? "POS"
                  : collection.method === "LINK"
                    ? "Link"
                    : "Nakit"}{" "}
                · {collection.cashAccountName} ·{" "}
                {new Date(collection.collectedAt).toLocaleString("tr-TR")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canWrite && remaining ? (
        <form
          onSubmit={handleCollect}
          className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70"
        >
          <div className="border-b border-[#e4f0f4] bg-[#eef6f8]/50 px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2f5563]" style={displayFont}>
              Tahsilat
            </h2>
          </div>
          <div className="grid gap-4 p-5">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Yöntem
              <select
                aria-label="Tahsilat yöntemi"
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as "CASH" | "CARD")
                }
                className={fieldClass}
              >
                <option value="CASH">Nakit</option>
                <option value="CARD">POS</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Tutar
              <input
                required
                aria-label="Tahsilat tutarı"
                value={amount}
                placeholder={item.remainingAmount}
                onChange={(event) => setAmount(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Kasa
              <select
                aria-label="Kasa hesabı"
                value={cashAccountId}
                onChange={(event) => setCashAccountId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Varsayılan nakit kasa</option>
                {(accounts.data ?? [])
                  .filter((account) => account.isActive)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Kaydediliyor…" : "Tahsilat al"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end gap-2">
        {canWrite && !item.receipt ? (
          <button
            type="button"
            className={btnOutline}
            disabled={saving}
            onClick={handleReceipt}
          >
            <Receipt className="h-4 w-4" />
            Fiş kes
          </button>
        ) : null}
        {item.receipt ? (
          <Link
            href={`/settings/sales/${saleId}/receipt`}
            className={btnOutline}
          >
            <FileText className="h-4 w-4" />
            Fiş {item.receipt.receiptNo}
          </Link>
        ) : null}
        {canWrite && item.receipt && item.officialDocument?.status !== "ISSUED" ? (
          <>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#5a7380]">
              Belge tipi
              <select
                aria-label="Resmi belge tipi"
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value as "E_FATURA" | "SMM")
                }
                className={fieldClass}
              >
                <option value="SMM">SMM</option>
                <option value="E_FATURA">e-Fatura</option>
              </select>
            </label>
            <button
              type="button"
              className={btnOutline}
              disabled={saving}
              onClick={handleOfficial}
            >
              Resmi belge kes
            </button>
          </>
        ) : null}
        {item.appointmentId && role !== "ACCOUNTANT" ? (
          <Link
            href={`/settings/appointments/${item.appointmentId}`}
            className={btnOutline}
          >
            <Calendar className="h-4 w-4" />
            Randevu
          </Link>
        ) : null}
      </div>

      {item.officialDocument?.status === "ISSUED" ? (
        <p className="mt-3 text-[13px] text-[#5a7380]">
          Resmi belge Planio içinden iptal/iade edilemez. İptal Uyumsoft ve GİB
          kurallarına tabidir; dahili satış fişi durur.
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm font-medium text-[#2f5563]">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </PageFrame>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[#1e3340]">{value}</dd>
    </div>
  );
}
