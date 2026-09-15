import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-planio-display",
  weight: ["600", "700"],
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-planio-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Planio",
    template: "%s · Planio",
  },
  description:
    "Güzellik işletmeleri için randevu, müşteri, personel ve tahsilat yönetimi.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${display.variable} ${sans.variable} flex min-h-full flex-col bg-[#F7FBFC] text-[#1e3340] antialiased`}
      style={{ fontFamily: "var(--font-planio-sans), sans-serif" }}
    >
      <SiteHeader />
      <div className="flex flex-1 flex-col pt-[7.5rem] xl:pt-20">{children}</div>
      <SiteFooter />
    </div>
  );
}
