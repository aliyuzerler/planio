import { type ReactNode, Suspense } from "react";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-planio-display",
  weight: ["600", "700"],
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-planio-sans",
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${display.variable} ${sans.variable} min-h-full bg-[#F7FBFC] text-[#1e3340] antialiased`}
      style={{ fontFamily: "var(--font-planio-sans), sans-serif" }}
    >
      <Suspense
        fallback={
          <main className="p-6 text-[15px] text-[#5a7380]">Yükleniyor…</main>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
