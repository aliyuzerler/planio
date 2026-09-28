import Link from "next/link";
import { PlanioLogo } from "@/components/brand/planio-logo";

const PLATFORM_LINKS = [
  { href: "/#ozellikler", label: "Özellikler" },
  { href: "/#moduller", label: "Modüller" },
  { href: "/#yorumlar", label: "Yorumlar" },
  { href: "/register", label: "Kayıt ol" },
] as const;

const COMPANY_LINKS = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/iletisim", label: "Bize Ulaşın" },
  { href: "/#sss", label: "SSS" },
  { href: "/gizlilik", label: "Gizlilik politikası" },
  { href: "/mesafeli-satis-sozlesmesi", label: "Mesafeli satış sözleşmesi" },
] as const;

export function SiteFooter() {
  return (
    <footer className="w-full bg-[#eef6f8] pb-10 pt-16">
      <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
        <div className="mb-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <PlanioLogo className="h-8" />
            <p className="max-w-sm text-[15px] leading-6 text-[#5a7380]">
              Güzellik merkezleri ve salonlar için randevu, müşteri, personel ve
              tahsilatı tek panelde birleştiren işletme yönetimi.
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-[#3d6b7a] shadow-sm">
                KVKK uyumlu
              </span>
              <span className="inline-flex rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-[#3d6b7a] shadow-sm">
                iyzico &amp; Uyumsoft hazır
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-base font-semibold text-[#1e3340]">Platform</span>
            <div className="flex flex-col gap-2.5">
              {PLATFORM_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[15px] text-[#5a7380] transition-colors hover:text-[#1e3340]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-base font-semibold text-[#1e3340]">Kurumsal</span>
            <div className="flex flex-col gap-2.5">
              {COMPANY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[15px] text-[#5a7380] transition-colors hover:text-[#1e3340]"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="mailto:destek@planio.app"
                className="text-[15px] text-[#5a7380] transition-colors hover:text-[#1e3340]"
              >
                destek@planio.app
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#c5dde6]/70 pt-8 md:flex-row">
          <p className="text-[13px] text-[#5a7380]">
            © {new Date().getFullYear()} Planio. Tüm hakları saklıdır.
          </p>
          <div className="flex flex-wrap gap-6 text-[13px] text-[#5a7380]">
            <Link href="/gizlilik" className="hover:text-[#1e3340]">
              Gizlilik Politikası
            </Link>
            <Link
              href="/mesafeli-satis-sozlesmesi"
              className="hover:text-[#1e3340]"
            >
              Mesafeli Satış Sözleşmesi
            </Link>
            <Link href="/iletisim" className="hover:text-[#1e3340]">
              İletişim
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
