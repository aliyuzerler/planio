import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hakkımızda",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-8">
      <p className="text-sm font-medium tracking-wide text-[#6aa9bb]">Planio</p>
      <h1
        className="mt-2 text-3xl tracking-tight text-slate-900 sm:text-4xl"
        style={{ fontFamily: "var(--font-planio-display), serif" }}
      >
        Hakkımızda
      </h1>
      <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
        <p>
          Planio, güzellik merkezleri ve salonlar için randevu ile günlük
          işletme yönetimini bir araya getiren bir çalışma alanıdır. Amacımız
          karmaşık paneller yerine net, güvenilir ve hızlı bir operasyon
          deneyimi sunmak.
        </p>
        <p>
          Takvimden müşteri kartına, personelden satış ve tahsilata kadar
          ihtiyaç duyulan temel süreçleri tek çatı altında topluyoruz. Böylece
          ekibiniz randevuya odaklanırken işletme sahibi de finans ve
          abonelik durumunu net biçimde takip edebilir.
        </p>
        <p>
          Platform; işletme sahibi, yönetici, personel ve muhasebe rollerine
          göre yetkilendirilir. Veriler işletmenize aittir; erişim ve denetim
          izleri şeffaf tutulur.
        </p>
      </div>
      <Link
        href="/register"
        className="mt-10 inline-flex rounded-lg bg-[#7eb8c8] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6aa9bb]"
      >
        Hemen başlayın
      </Link>
    </main>
  );
}
