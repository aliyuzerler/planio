import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Planio — Güzellik işletmeleri için randevu yönetimi",
    template: "%s · Planio",
  },
  description:
    "Özel sağlık, diş ve güzellik klinikleri için randevu ve işletme yönetimi",
  openGraph: {
    type: "website",
    siteName: "Planio",
    locale: "tr_TR",
    images: [{ url: "/planio-hero-salon.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/planio-hero-salon.jpg"],
  },
  icons: {
    icon: [{ url: "/planio-icon.svg", type: "image/svg+xml" }],
    shortcut: ["/planio-icon.svg"],
    apple: [{ url: "/planio-icon.svg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
