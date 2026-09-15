"use client";

import { useParams } from "next/navigation";
import { Button } from "@xenior/ui";
import { PageFrame } from "@/components/ui/page-frame";
import { PageHeader } from "@/components/ui/page-header";
import { useSaleReceipt } from "@/lib/ledger/ledger-queries";

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

  if (receipt.isLoading) return <PageFrame>Fiş yükleniyor…</PageFrame>;
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
    <PageFrame width="lg">
      <PageHeader
        title={receipt.data.receiptNo}
        description="Dahili satış fişi. Resmi e-belge değildir."
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={downloadReceipt}>
              İndir
            </Button>
            <Button type="button" onClick={printReceipt}>
              Yazdır
            </Button>
          </div>
        }
      />
      <iframe
        title={receipt.data.receiptNo}
        srcDoc={receipt.data.html}
        className="mt-6 min-h-[640px] w-full rounded-xl border border-zinc-200 bg-white"
      />
    </PageFrame>
  );
}
