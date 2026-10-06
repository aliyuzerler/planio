import type { NextConfig } from "next";

/**
 * Uygulama katmanında güvenlik başlıkları. nginx (TLS katmanı) benzer
 * başlıklar ekler; buradaki değerler uygulamayı tek başına çalıştırırken
 * (ör. yerel production build) de geçerli olur.
 *
 * CSP bilinçli olarak pragmatik: Next.js hydration script'leri nedeniyle
 * script-src 'unsafe-inline' içeriyor. Nonce'lu katı CSP, proxy katmanına
 * (proxy.ts) taşınmadan mümkün değil; lansman sonrası iyileştirme adayı.
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
    "img-src 'self' data: blob: https://lh3.googleusercontent.com",
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
  // Docker imajını küçültür: .next/standalone altında kendi kendine yeterli
  // sunucu üretir (node_modules'in tamamı imaja kopyalanmaz).
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: [
    "@xenior/ui",
    "@xenior/types",
    "@xenior/validation",
    "@xenior/config",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
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
