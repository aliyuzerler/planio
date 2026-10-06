import type { NextConfig } from "next";

/**
 * Uygulama katmanında güvenlik başlıkları (web uygulamasıyla aynı politika;
 * admin panelinde harici görsel kaynağı yok). nginx de benzer başlıklar
 * ekler; bu değerler uygulamayı tek başına çalıştırırken geçerli olur.
 */
function securityHeaders(): Record<string, string> {
  const isDev = process.env.NODE_ENV !== "production";
  const apiOrigin = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
    } catch {
      return null;
    }
  })();

  const connectSources = ["'self'", apiOrigin].filter(Boolean).join(" ");

  const csp = [
    "default-src 'self'",
    // Dev'de React Fast Refresh eval gerektirir; production'da gerekmez.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    // Yalnızca HTTPS üzerinden tarayıcıya kalıcı olarak hatırlanır.
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  };
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [
    "@xenior/ui",
    "@xenior/types",
    "@xenior/validation",
    "@xenior/config",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(securityHeaders()).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
