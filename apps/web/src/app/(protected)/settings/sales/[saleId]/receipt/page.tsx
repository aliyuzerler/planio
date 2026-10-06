"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { PageFrame } from "@/components/ui/page-frame";
import { useSaleReceipt } from "@/lib/ledger/ledger-queries";

const displayFont = { fontFamily: "var(--font-planio-display), sans-serif" } as const;
const btnPrimary =
  "inline-flex items-center gap-2 rounded-xl bg-[#3d7a8c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#33687a]";
const btnOutline =
  "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5563] ring-1 ring-[#c5dde6] transition hover:bg-[#eef6f8]";

export default function SaleReceiptPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const receipt = useSaleReceipt(saleId);

  function printReceipt() {
    if (!receipt.data) return;
    const popup = window.open("", "_blank");
    if (!popup) return;
    popup.document.write(receipt.data.html);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function downloadReceipt() {
    if (!receipt.data) return;
    const blob = new Blob([receipt.data.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${receipt.data.receiptNo}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (receipt.isLoading) {
    return (
      <PageFrame>
        <p className="text-sm text-[#5a7380]">Fiş yükleniyor…</p>
      </PageFrame>
    );
  }
  if (receipt.isError || !receipt.data) {
    return (
      <PageFrame>
        <p role="alert" className="text-sm text-red-700">
          Fiş bulunamadı. Önce satıştan fiş kesin.
        </p>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="lg" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-[#eef6f8] to-transparent"
      />

      <Link
        href={`/settings/sales/${saleId}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#3d6b7a] hover:text-[#2f5563]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Satışa dön
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#7eb8c8]">
            Dahili fiş
          </p>
          <h1
            className="mt-1 text-3xl font-semibold tracking-tight text-[#2f5563]"
            style={displayFont}
          >
            {receipt.data.receiptNo}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#5a7380]">
            Dahili satış fişi. Resmi e-belge değildir.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnOutline} onClick={downloadReceipt}>
            <Download className="h-4 w-4" />
            İndir
          </button>
          <button type="button" className={btnPrimary} onClick={printReceipt}>
            <Printer className="h-4 w-4" />
            Yazdır
          </button>
        </div>
      </div>

      <iframe
        title={receipt.data.receiptNo}
        srcDoc={receipt.data.html}
        className="mt-8 min-h-[640px] w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#c5dde6]/70"
      />
    </PageFrame>
  );
}
