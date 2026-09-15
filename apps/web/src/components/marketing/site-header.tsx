import Link from "next/link";
import { PlanioLogo } from "@/components/brand/planio-logo";

const NAV_LINKS = [
  { href: "/#ozellikler", label: "Özellikler" },
  { href: "/#moduller", label: "Modüller" },
  { href: "/#yorumlar", label: "Yorumlar" },
  { href: "/#sss", label: "SSS" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "İletişim" },
] as const;

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#c5dde6]/50 bg-white/90 shadow-[0_1px_8px_rgba(61,107,122,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-4 px-4 lg:px-8">
        <Link href="/" aria-label="Planio ana sayfa" className="shrink-0">
          <PlanioLogo className="h-8 sm:h-9" />
        </Link>

        <nav
          aria-label="Tanıtım menüsü"
          className="hidden items-center gap-0.5 rounded-full bg-[#eef6f8]/80 p-1 xl:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-[#5a7380] transition-colors hover:bg-[#e4f0f4] hover:text-[#2f5563]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-[13px] font-semibold text-[#5a7380] transition-colors hover:text-[#3d6b7a] sm:inline-flex"
          >
            Giriş Yap
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-[#7eb8c8] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6aa9bb]"
          >
            Ücretsiz Dene
          </Link>
        </div>
      </div>

      <nav
        aria-label="Mobil tanıtım menüsü"
        className="flex gap-3 overflow-x-auto border-t border-[#c5dde6]/40 px-4 py-2 text-[13px] text-[#5a7380] xl:hidden"
      >
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="shrink-0 font-semibold hover:text-[#2f5563]">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
