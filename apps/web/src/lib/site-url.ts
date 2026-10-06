/**
 * Kanonik site adresi. Production'da NEXT_PUBLIC_SITE_URL ile, yoksa
 * NEXT_PUBLIC_API_URL'in kökünden, o da yoksa localhost ile çözümlenir.
 * metadataBase, sitemap ve robots tarafından kullanılır.
 */
export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      return `${url.protocol}//${url.host}`;
    } catch {
      // sıradakini dene
    }
  }
  return "http://localhost:3000";
}
