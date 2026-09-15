import type { SaleRecord } from "@xenior/types";

export function renderSalesReceiptHtml(
  sale: SaleRecord,
  receiptNo: string,
  businessName: string,
): string {
  const lines = sale.lines
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.nameSnapshot)}</td><td>${line.quantity}</td><td>${line.unitPrice} ${sale.currency}</td><td>${line.lineTotal} ${sale.currency}</td></tr>`,
    )
    .join("");
  const discount =
    sale.discountAmountSnapshot !== "0.00"
      ? `<p>Liste: ${sale.listPriceSnapshot} ${sale.currency} · İndirim: ${sale.discountAmountSnapshot} ${sale.currency}${sale.campaignNameSnapshot ? ` (${escapeHtml(sale.campaignNameSnapshot)})` : ""}</p>`
      : "";
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(receiptNo)}</title>
  <style>
    body { font-family: sans-serif; max-width: 720px; margin: 24px auto; color: #18181b; }
    h1 { font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border-bottom: 1px solid #e4e4e7; text-align: left; padding: 8px 0; }
    .muted { color: #52525b; font-size: 13px; }
  </style>
</head>
<body>
  <p class="muted">Dahili satış fişi · resmi e-belge değildir</p>
  <h1>${escapeHtml(businessName)}</h1>
  <p>Fiş no: <strong>${escapeHtml(receiptNo)}</strong></p>
  <p>Müşteri: ${escapeHtml(`${sale.customer.firstName} ${sale.customer.lastName}`)}</p>
  <p>Tarih: ${new Date(sale.createdAt).toLocaleString("tr-TR")}</p>
  <table>
    <thead><tr><th>Hizmet</th><th>Adet</th><th>Birim</th><th>Tutar</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>
  ${discount}
  <p><strong>Toplam: ${sale.totalAmount} ${sale.currency}</strong></p>
  <p>Tahsil edilen: ${sale.collectedAmount} ${sale.currency}</p>
  <p>Kalan: ${sale.remainingAmount} ${sale.currency}</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
