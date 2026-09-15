"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@xenior/ui";
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

  if (sale.isLoading) return <PageFrame>Satış yükleniyor…</PageFrame>;
  if (sale.isError || !sale.data) {
    return (
      <PageFrame>
        <p role="alert" className="text-sm text-red-700">Satış bulunamadı.</p>
      </PageFrame>
    );
  }

  const item = sale.data;
  const remaining = item.remainingAmount !== "0.00";

  return (
    <PageFrame width="sm">
      <h1 className="text-2xl font-semibold">
        {item.customer.firstName} {item.customer.lastName}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        {item.source === "APPOINTMENT" ? "Randevu satışı" : "Tezgah satışı"} ·{" "}
        {item.status === "SETTLED" ? "Kapandı" : "Açık hesap"}
      </p>
      <dl className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-zinc-500">Hizmet</dt>
          <dd className="mt-1 text-sm">{item.lines[0]?.nameSnapshot ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Toplam</dt>
          <dd className="mt-1 text-sm">
            {item.totalAmount} {item.currency}
            {item.discountAmountSnapshot !== "0.00"
              ? ` · liste ${item.listPriceSnapshot}, indirim ${item.discountAmountSnapshot}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Tahsil edilen</dt>
          <dd className="mt-1 text-sm">
            {item.collectedAmount} {item.currency}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Kalan</dt>
          <dd className="mt-1 text-sm">
            {item.remainingAmount} {item.currency}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-zinc-500">Resmi belge</dt>
          <dd className="mt-1 text-sm">
            {item.officialDocument?.status === "ISSUED" && item.officialDocument.documentNo
              ? `${item.officialDocument.type === "SMM" ? "SMM" : "e-Fatura"} ${item.officialDocument.documentNo}`
              : item.officialDocument?.status === "FAILED"
                ? "Kesilemedi"
                : "Yok · önce dahili fiş gerekir"}
          </dd>
        </div>
      </dl>

      {item.collections.length ? (
        <section className="mt-6 rounded-xl border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold">Tahsilatlar</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {item.collections.map((collection) => (
              <li key={collection.id}>
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
          className="mt-6 grid gap-3 rounded-xl border border-zinc-200 p-6"
        >
          <h2 className="text-lg font-semibold">Tahsilat</h2>
          <label className="flex flex-col gap-1 text-sm">
            Yöntem
            <select
              aria-label="Tahsilat yöntemi"
              value={method}
              onChange={(event) => setMethod(event.target.value as "CASH" | "CARD")}
              className="rounded-md border border-zinc-300 px-3 py-2"
            >
              <option value="CASH">Nakit</option>
              <option value="CARD">POS</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tutar
            <input
              required
              aria-label="Tahsilat tutarı"
              value={amount}
              placeholder={item.remainingAmount}
              onChange={(event) => setAmount(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Kasa
            <select
              aria-label="Kasa hesabı"
              value={cashAccountId}
              onChange={(event) => setCashAccountId(event.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2"
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
          <Button type="submit" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Tahsilat al"}
          </Button>
        </form>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end gap-2">
        {canWrite && !item.receipt ? (
          <Button type="button" variant="outline" disabled={saving} onClick={handleReceipt}>
            Fiş kes
          </Button>
        ) : null}
        {item.receipt ? (
          <Button asChild variant="outline">
            <Link href={`/settings/sales/${saleId}/receipt`}>
              Fiş {item.receipt.receiptNo}
            </Link>
          </Button>
        ) : null}
        {canWrite && item.receipt && item.officialDocument?.status !== "ISSUED" ? (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Belge tipi
              <select
                aria-label="Resmi belge tipi"
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value as "E_FATURA" | "SMM")
                }
                className="rounded-md border border-zinc-300 px-3 py-2"
              >
                <option value="SMM">SMM</option>
                <option value="E_FATURA">e-Fatura</option>
              </select>
            </label>
            <Button type="button" variant="outline" disabled={saving} onClick={handleOfficial}>
              Resmi belge kes
            </Button>
          </>
        ) : null}
        {item.appointmentId && role !== "ACCOUNTANT" ? (
          <Button asChild variant="outline">
            <Link href={`/settings/appointments/${item.appointmentId}`}>Randevu</Link>
          </Button>
        ) : null}
      </div>
      {item.officialDocument?.status === "ISSUED" ? (
        <p className="mt-3 text-xs text-zinc-600">
          Resmi belge Planio içinden iptal/iade edilemez. İptal Uyumsoft ve GİB kurallarına
          tabidir; dahili satış fişi durur.
        </p>
      ) : null}
      {message ? <p className="mt-4 text-sm text-emerald-800">{message}</p> : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </PageFrame>
  );
}
