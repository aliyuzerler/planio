"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  ChevronDown,
  PlayCircle,
  Receipt,
  Sparkles,
  Star,
  TrendingUp,
  BadgeCheck,
  Wallet,
  Users,
  X,
} from "lucide-react";

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f0f4] px-3.5 py-1.5 text-[13px] font-semibold text-[#3d6b7a]">
      {children}
    </span>
  );
}

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="text-base font-bold text-[#3d6b7a]">{question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#7eb8c8] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <p className="mt-3 text-[15px] leading-6 text-[#5a7380]">{answer}</p>
      ) : null}
    </div>
  );
}

const SECTOR_IMAGES = {
  beauty:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC2wI3UawP7AHA7LpEwLr57TCM9Cq8waO3yxSMPQecWVQBOoTFrYIefZUTZ-RLG5bmVyXvtJPL1E9YwCntg-2MV1VHERmCsAXHK7pAuTL39xZPAxSxVXPgJoqldYyXbFpG3tbpf1iaYI-WSMy7D77E04RFp7S34CQENooIBqdY6CtJpZexV12mdGC4aV7-3krCZXMzprAYKvt85PEnlJHtIMKk0b8_1ci6cD9gn2Tzta008PYqQwGH_kQ",
  dental:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAT5udKkjqBhT8aCJE7NgiFo1MKszARSo4FB71y-Wk0YvBK93CHuHi5QFGTT-e8UqOFI2wVJCwchwwgZ-bHu91ywvDE70PKs5xP0OyTVDRgAK5t8wNcWO1ZxLj2eliQkq6irhNWTMAOxVJsKaD0C3cOViMLz6PV2llB4N--wzSs4rESk-bPo_VUH_d_3YWXMkNV2nQTE5_fij-j5W9AakqRBG88WGu0uPwV0dE3bUOZSRbp71oxDvQe8A",
  clinic:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAxh9iofPpdtDHazUjXB6BkcKkDKss9etjf4quvojdd_lRy1STOaC_hOO4Sw1gl1jLUzm0TKd8QCTT1928mwS4Qxv4pzpjE8m_yAsqAZfK8X44ZH_ajL-axnbqNjhTdL8muPr4A25jigEMPx0BatptCSa7_HNylrvWYCKCSn7zySAmt4tkerT3Y-eQYi2WYIUR_a6UDra2lzcmFeGrtSADr7rKoW9awGDpvRmrBcjtTIr3uXeyfuU6CLw",
} as const;

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  return (
    <main className="w-full bg-[#F7FBFC]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F7FBFC] via-[#eef6f8]/70 to-[#F7FBFC] pb-24 pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[920px] -translate-x-1/2 rounded-full bg-[#b8e6df]/35 blur-[120px]"
        />
        <div className="relative z-10 mx-auto flex max-w-[1280px] flex-col items-center px-4 text-center lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-[#3d6b7a] shadow-sm">
            <BadgeCheck className="h-[18px] w-[18px] text-[#7eb8c8]" />
            Güzellik işletmeleri için modern işletme paneli
          </div>

          <h1
            className="mb-4 max-w-4xl text-4xl font-bold tracking-tight text-[#2f5563] sm:text-5xl lg:text-[56px] lg:leading-[68px]"
            style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
          >
            İşletmenizi{" "}
            <span className="bg-gradient-to-r from-[#98b5d7] via-[#7eb8c8] to-[#b8e6df] bg-clip-text text-transparent">
              tek panelden
            </span>{" "}
            yönetin
          </h1>

          <p className="mb-10 max-w-3xl text-lg leading-7 text-[#5a7380]">
            Akıllı randevu, müşteri kartı, personel, satış, kasa ve resmi belge
            süreçlerini Planio ile tek bulut panelinde birleştirin.
          </p>

          <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-[#7eb8c8] px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#6aa9bb]"
            >
              Ücretsiz başlayın
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#1e3340] shadow-sm transition hover:bg-[#eef6f8]"
            >
              <PlayCircle className="h-[22px] w-[22px] fill-[#7eb8c8] text-[#7eb8c8]" />
              Paneli inceleyin
            </button>
          </div>

          <div className="mb-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-semibold text-[#5a7380]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-[#7eb8c8]" /> Kredi kartı gerekmez
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-[#7eb8c8]" /> Hızlı kurulum
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-[#7eb8c8]" /> KVKK uyumlu altyapı
            </span>
          </div>

          {/* Dashboard mock */}
          <div className="w-full max-w-[1180px] overflow-hidden rounded-2xl bg-white p-4 shadow-xl lg:p-6">
            <div className="-mx-4 -mt-4 mb-4 flex flex-wrap items-center justify-between bg-[#eef6f8]/80 px-6 pb-4 pt-4 lg:-mx-6 lg:-mt-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ef4444]/80" />
                <span className="h-3 w-3 rounded-full bg-[#f59e0b]/80" />
                <span className="h-3 w-3 rounded-full bg-[#10b981]/80" />
                <span className="ml-2 text-[13px] font-semibold text-[#5a7380]">
                  Planio · Canlı işletme paneli
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] font-bold text-[#3d6b7a]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#7eb8c8]" />
                Gerçek zamanlı
              </span>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Günlük randevu",
                  value: "34 randevu",
                  meta: "%98 doluluk",
                  icon: Calendar,
                },
                {
                  label: "Aylık tahsilat",
                  value: "₺186.500",
                  meta: "Geçen aya +%18",
                  icon: Wallet,
                },
                {
                  label: "Aktif müşteri",
                  value: "1.284",
                  meta: "Son 30 günde 96 yeni",
                  icon: Users,
                },
                {
                  label: "Personel hakediş",
                  value: "Hazır",
                  meta: "Prim kuralları otomatik",
                  icon: TrendingUp,
                },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl bg-[#eef6f8] p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#5a7380]">
                      {kpi.label}
                    </span>
                    <kpi.icon className="h-5 w-5 text-[#7eb8c8]" />
                  </div>
                  <div
                    className="text-2xl font-semibold tracking-tight text-[#2f5563]"
                    style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
                  >
                    {kpi.value}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#3d6b7a]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {kpi.meta}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 text-left lg:grid-cols-3">
              <div className="rounded-xl bg-[#F7FBFC] p-4 lg:col-span-2">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-[#1e3340]">
                      Bugünün randevu çizelgesi
                    </span>
                    <span className="rounded-full bg-[#7eb8c8]/15 px-2 py-0.5 text-[11px] font-bold text-[#3d6b7a]">
                      Bugün
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    {
                      time: "14:00",
                      name: "Ece Karahan",
                      detail: "Lazer epilasyon · Uzm. Derya T.",
                      status: "Tamamlandı",
                      amount: "₺2.400",
                      active: false,
                    },
                    {
                      time: "15:00",
                      name: "Murat Yılmaz",
                      detail: "Medikal cilt bakımı · Ayşe K.",
                      status: "İşlemde",
                      amount: "₺4.500",
                      active: true,
                    },
                    {
                      time: "16:30",
                      name: "Aylin Sezgin",
                      detail: "Kaş tasarımı · Selin K.",
                      status: "Onaylı",
                      amount: "₺1.800",
                      active: false,
                    },
                  ].map((row) => (
                    <div
                      key={row.time}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 ${
                        row.active ? "bg-[#b8e6df]/35" : "bg-white hover:bg-[#eef6f8]"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 text-[13px] font-bold text-[#3d6b7a]">
                          {row.time}
                        </div>
                        <div>
                          <div className="text-base font-semibold leading-tight text-[#1e3340]">
                            {row.name}
                          </div>
                          <div className="text-[13px] text-[#5a7380]">{row.detail}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                            row.active
                              ? "bg-[#7eb8c8] text-white"
                              : "bg-[#e4f0f4] text-[#3d6b7a]"
                          }`}
                        >
                          {row.status}
                        </span>
                        <span className="text-[13px] font-bold text-[#2f5563]">
                          {row.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-[#F7FBFC] p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-base font-semibold text-[#1e3340]">
                      Bildirim akışı
                    </span>
                    <Receipt className="h-5 w-5 text-[#7eb8c8]" />
                  </div>
                  <p className="mb-4 text-[13px] text-[#5a7380]">
                    Randevu hatırlatmaları ve onay mesajları
                  </p>
                  <div className="mb-4 space-y-2 rounded-lg bg-white p-3">
                    <div className="text-[11px] font-bold text-[#1e3340]">
                      Otomatik hatırlatıcı
                    </div>
                    <p className="text-[13px] text-[#5a7380]">
                      “Yarın saat 11:30’daki randevunuz için onayınızı rica ederiz.”
                    </p>
                    <div className="flex justify-end">
                      <span className="rounded bg-[#7eb8c8]/15 px-2 py-0.5 text-[11px] font-bold text-[#3d6b7a]">
                        Onaylandı
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/register"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3d6b7a] py-2.5 text-[13px] font-semibold text-white hover:bg-[#2f5563]"
                  >
                    Hızlı randevu tanımla
                  </Link>
                  <Link
                    href="/register"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e4f0f4] py-2.5 text-[13px] font-semibold text-[#1e3340] hover:bg-[#d7e8ee]"
                  >
                    Satış &amp; tahsilat
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors bar */}
      <section className="w-full bg-[#eef6f8]/70 py-10">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <p className="mb-6 text-center text-[13px] font-semibold uppercase tracking-wider text-[#5a7380]">
            Estetik, güzellik ve bakım işletmeleri için tasarlandı
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { title: "Güzellik merkezi", sub: "Lazer, cilt, spa", icon: Sparkles },
              { title: "Kuaför &amp; salon", sub: "Personel &amp; koltuk", icon: Users },
              { title: "Estetik klinik", sub: "Seans &amp; paket", icon: BadgeCheck },
              { title: "Bakım stüdyosu", sub: "Randevu &amp; kasa", icon: Calendar },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5"
              >
                <item.icon className="h-7 w-7 shrink-0 text-[#7eb8c8]" />
                <div className="text-left">
                  <span
                    className="block text-base font-semibold leading-tight text-[#1e3340]"
                    dangerouslySetInnerHTML={{ __html: item.title }}
                  />
                  <span
                    className="text-[13px] text-[#5a7380]"
                    dangerouslySetInnerHTML={{ __html: item.sub }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="moduller" className="scroll-mt-28 w-full bg-[#F7FBFC] py-24">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="mb-16 max-w-3xl">
            <Pill>Entegre işletme ekosistemi</Pill>
            <h2
              className="mt-3 mb-3 text-3xl font-semibold tracking-tight text-[#2f5563] sm:text-4xl"
              style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
            >
              Tek yazılım, dört temel direk
            </h2>
            <p className="text-lg leading-7 text-[#5a7380]">
              Farklı araçlar arasında veri kaybetmeyin. Planio; randevu, satış,
              tahsilat ve ekip süreçlerini birbirine bağlar.
            </p>
          </div>

          <div id="ozellikler" className="scroll-mt-28 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                title: "Akıllı randevu &amp; hatırlatma",
                body: "Personel ve kaynak bazlı takvim, çakışma kontrolü ve bildirim akışı ile no-show’u azaltın.",
                points: [
                  "Personel / kaynak bazlı esnek takvim",
                  "Otomatik randevu öncesi hatırlatmalar",
                  "Durum: onaylı, tamamlandı, iptal, gelmedi",
                ],
              },
              {
                title: "Satış, kampanya &amp; prim",
                body: "Paket ve kampanya fiyatları, personel prim kuralları ve hakediş hesaplarını net tutun.",
                points: [
                  "Kampanya ve fiyat teklifi",
                  "Prim kuralları ve hakediş",
                  "Satış fişi ve tahsilat izi",
                ],
              },
              {
                title: "Kasa, cari &amp; resmi belge",
                body: "Kasa, cari bakiye, giderler ve Uyumsoft üzerinden e-Fatura / SMM hazırlığı tek panelde.",
                points: [
                  "Kasa ve cari takip",
                  "POS tahsilat işaretleme",
                  "Uyumsoft resmi belge akışı",
                ],
              },
              {
                title: "Müşteri &amp; ekip yönetimi",
                body: "Müşteri kartları, dosyalar, uzmanlıklar ve işletme ayarlarını güvenle yönetin.",
                points: [
                  "Müşteri profili ve dosyalar",
                  "Personel ve uzmanlıklar",
                  "Rol bazlı yetkilendirme",
                ],
              },
            ].map((mod, index) => (
              <div
                key={mod.title}
                className="flex flex-col justify-between rounded-2xl bg-white p-8 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#b8e6df]/40 text-[#3d6b7a]">
                    <span className="text-sm font-bold">0{index + 1}</span>
                  </div>
                  <h3
                    className="mb-3 text-2xl font-semibold text-[#2f5563]"
                    style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
                    dangerouslySetInnerHTML={{ __html: mod.title }}
                  />
                  <p className="mb-6 text-[15px] leading-6 text-[#5a7380]">{mod.body}</p>
                  <ul className="mb-6 space-y-2 text-[15px] text-[#1e3340]">
                    {mod.points.map((point) => (
                      <li key={point} className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 shrink-0 text-[#7eb8c8]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sector spotlight */}
      <section className="w-full bg-[#eef6f8]/50 py-24">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <Pill>Sektörel uyum</Pill>
            <h2
              className="mt-3 mb-3 text-3xl font-semibold tracking-tight text-[#2f5563] sm:text-4xl"
              style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
            >
              Güzellik operasyonuna göre şekillendi
            </h2>
            <p className="text-lg leading-7 text-[#5a7380]">
              Standart bir ajanda değil; randevu, seans ve tahsilat ritmine uygun
              bir çalışma alanı.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[
              {
                img: SECTOR_IMAGES.beauty,
                title: "Güzellik &amp; estetik",
                body: "Seanslı işlemler, personel primleri ve müşteri sadakatini tek yerden yönetin.",
              },
              {
                img: SECTOR_IMAGES.dental,
                title: "Salon &amp; stüdyo",
                body: "Koltuk / kaynak planı, hizmet kataloğu ve günlük kasa kapanışını sadeleştirin.",
              },
              {
                img: SECTOR_IMAGES.clinic,
                title: "Çok şubeli markalar",
                body: "Rol bazlı erişim, abonelik ve denetim izleriyle büyüyen ekiplere hazır.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={card.img}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <h3
                      className="mb-2 text-xl font-semibold text-[#2f5563]"
                      style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
                      dangerouslySetInnerHTML={{ __html: card.title }}
                    />
                    <p className="mb-4 text-[15px] leading-6 text-[#5a7380]">{card.body}</p>
                  </div>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-between rounded-lg bg-[#eef6f8] px-4 py-2.5 text-[13px] font-semibold text-[#2f5563] hover:bg-[#e4f0f4]"
                  >
                    Çözümü inceleyin
                    <ArrowRight className="h-[18px] w-[18px]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI band */}
      <section className="relative w-full overflow-hidden bg-[#3d6b7a] py-24 text-white">
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="mb-3 inline-block rounded-full bg-[#2f5563] px-3.5 py-1 text-[13px] font-semibold text-[#b8e6df]">
              Ölçülebilir sonuç
            </span>
            <h2
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
            >
              Planio ile operasyonu sadeleştirin
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                stat: "%75",
                title: "Daha az randevu kaybı",
                body: "Hatırlatma ve durum takibi ile boş kalan slotları azaltın.",
              },
              {
                stat: "+8s",
                title: "Haftalık zaman",
                body: "Excel ve kağıt defter yerine tek panelde kapanış.",
              },
              {
                stat: "1 panel",
                title: "Randevu + finans",
                body: "Satış, kasa, cari ve hakediş aynı yerde.",
              },
              {
                stat: "KVKK",
                title: "Güvenli erişim",
                body: "Rol bazlı yetki ve denetim kaydı ile şeffaflık.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-[#2f5563]/50 p-8 backdrop-blur-sm"
              >
                <div
                  className="mb-2 text-4xl font-bold leading-none text-[#b8e6df] sm:text-5xl"
                  style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
                >
                  {item.stat}
                </div>
                <div className="mb-2 text-xl font-semibold">{item.title}</div>
                <p className="text-[13px] leading-5 text-[#b8e6df]/90">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="yorumlar" className="scroll-mt-28 w-full bg-[#F7FBFC] py-24">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="mb-16">
            <Pill>Müşteri yorumları</Pill>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight text-[#2f5563] sm:text-4xl"
              style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
            >
              İşletmeler Planio’yu anlatıyor
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "Paket ve seans takibinde müşterilerle sürekli tartışıyorduk. Planio sonrası kalan haklar ve satışlar net; gelir kaçağı azaldı.",
                name: "Selin Kaya",
                role: "Estetik merkez işletmecisi",
              },
              {
                quote:
                  "Randevu çizelgesi, personel primleri ve kasa aynı panelde. Ay sonu mutabakatı artık dakikalar sürüyor.",
                name: "Burak Çetin",
                role: "Salon kurucu ortak",
              },
              {
                quote:
                  "Birden fazla lokasyonu telefondan takip edebiliyorum. Rol yetkileri ve abonelik durumu net.",
                name: "Melis Aydın",
                role: "Çok şubeli güzellik grubu",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="flex flex-col justify-between rounded-2xl bg-white p-8 shadow-sm"
              >
                <div>
                  <div className="mb-4 flex gap-1 text-[#f59e0b]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                  <p className="mb-6 text-[15px] italic leading-6 text-[#1e3340]">
                    “{t.quote}”
                  </p>
                </div>
                <div>
                  <div className="text-base font-bold text-[#2f5563]">{t.name}</div>
                  <div className="text-[13px] text-[#5a7380]">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="w-full bg-[#eef6f8]/60 py-24">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <Pill>Açık karşılaştırma</Pill>
            <h2
              className="mt-3 mb-3 text-3xl font-semibold tracking-tight text-[#2f5563] sm:text-4xl"
              style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
            >
              Neden Planio?
            </h2>
            <p className="text-lg leading-7 text-[#5a7380]">
              Kağıt defter ve parçalı araçlar yerine tek bulut paneli.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#e4f0f4]/80">
                    <th className="w-1/3 p-6 text-base font-semibold text-[#1e3340]">
                      Özellik
                    </th>
                    <th className="w-1/5 p-6 text-center text-base font-semibold text-[#5a7380]">
                      Excel / defter
                    </th>
                    <th className="w-1/5 p-6 text-center text-base font-semibold text-[#5a7380]">
                      Eski yazılımlar
                    </th>
                    <th className="w-1/4 bg-[#b8e6df]/40 p-6 text-center text-base font-bold text-[#2f5563]">
                      Planio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Her yerden erişim", "Yok", "Sadece ofis PC", "Bulut · mobil hazır"],
                    ["Randevu + finans bir arada", "Yok", "Parçalı", "Tek panel"],
                    ["Rol bazlı yetki", "Yok", "Zayıf", "Owner / personel / muhasebe"],
                    ["e-Belge &amp; POS hazırlığı", "Yok", "Ayrı yazılım", "Panel içinden"],
                    ["Denetim kaydı", "Yok", "Sınırlı", "İşlem izi"],
                  ].map((row, i) => (
                    <tr
                      key={row[0]}
                      className={i % 2 ? "bg-[#eef6f8]/40" : undefined}
                    >
                      <td
                        className="p-4 pl-6 text-[15px] font-semibold text-[#1e3340]"
                        dangerouslySetInnerHTML={{ __html: row[0] }}
                      />
                      <td className="p-4 text-center text-[13px] font-semibold text-red-600">
                        {row[1]}
                      </td>
                      <td className="p-4 text-center text-[13px] font-semibold text-red-600">
                        {row[2]}
                      </td>
                      <td className="bg-[#b8e6df]/20 p-4 text-center text-[13px] font-semibold text-[#3d6b7a]">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {row[3]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="sss" className="scroll-mt-28 w-full bg-[#F7FBFC] py-24">
        <div className="mx-auto max-w-[880px] px-4 lg:px-8">
          <div className="mb-16 text-center">
            <Pill>Aklınıza takılanlar</Pill>
            <h2
              className="mt-3 mb-3 text-3xl font-semibold tracking-tight text-[#2f5563] sm:text-4xl"
              style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
            >
              Sıkça sorulan sorular
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Verilerimiz güvende mi?",
                a: "Planio, rol bazlı erişim, oturum güvenliği ve denetim kaydı ile işletme verilerinizi korur. Kart numarası gibi hassas ödeme verileri Planio’da tutulmaz.",
              },
              {
                q: "Mevcut müşteri listemi aktarabilir miyim?",
                a: "Müşteri ve katalog verilerinizi panele taşıyarak hızlıca başlayabilirsiniz. Destek için iletişim sayfamızdan yazabilirsiniz.",
              },
              {
                q: "Abonelik ödemesi nasıl çalışır?",
                a: "Plan seçimi sonrası ödeme iyzico Checkout Form üzerinden doğrulanır. Kart bilgisi Planio’da saklanmaz.",
              },
              {
                q: "Gizli kurulum ücreti var mı?",
                a: "Hayır. Şeffaf abonelik modeli vardır; hesabınızı oluşturup planınızı panelden yönetirsiniz.",
              },
            ].map((item, index) => (
              <FaqItem
                key={item.q}
                question={item.q}
                answer={item.a}
                open={faqOpen === index}
                onToggle={() => setFaqOpen(faqOpen === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full bg-[#eef6f8] py-24">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#3d6b7a] p-10 text-center text-white shadow-xl lg:p-24">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#7eb8c8]/30 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#b8e6df]/20 blur-3xl"
            />
            <div className="relative z-10 mx-auto max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#2f5563] px-3.5 py-1.5 text-[13px] font-semibold text-[#b8e6df]">
                Hemen bugün başlayın
              </div>
              <h2
                className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl"
                style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
              >
                İşletmenizin dijital panelini bugün açın
              </h2>
              <p className="mx-auto mb-10 max-w-2xl text-lg leading-7 text-[#b8e6df]">
                Hesabınızı oluşturun, randevu ve tahsilatı tek yerden yönetmeye
                başlayın.
              </p>
              <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7eb8c8] px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#b8e6df] hover:text-[#2f5563]"
                >
                  Ücretsiz hesap oluştur
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/iletisim"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  İletişime geçin
                </Link>
              </div>
              <p className="text-[11px] font-bold tracking-wide text-[#b8e6df]/90">
                Taahhüt yok · Destek için destek@planio.app
              </p>
            </div>
          </div>
        </div>
      </section>

      {demoOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e3340]/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4
                className="text-xl font-semibold text-[#2f5563]"
                style={{ fontFamily: "var(--font-planio-display), sans-serif" }}
              >
                Planio panel turu
              </h4>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef6f8] text-[#1e3340] hover:bg-[#e4f0f4]"
                onClick={() => setDemoOpen(false)}
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex aspect-video flex-col items-center justify-center rounded-xl bg-[#e4f0f4] p-6 text-center">
              <PlayCircle className="mb-2 h-14 w-14 text-[#3d6b7a]" />
              <p className="text-base font-bold text-[#2f5563]">
                Canlı paneli denemek için hesap oluşturun
              </p>
              <p className="mt-1 text-[13px] text-[#5a7380]">
                Kayıt sonrası gösterge, randevu ve finans ekranlarını hemen
                kullanabilirsiniz.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#eef6f8] px-4 py-2 text-[13px] font-semibold text-[#1e3340]"
                onClick={() => setDemoOpen(false)}
              >
                Kapat
              </button>
              <Link
                href="/register"
                className="rounded-lg bg-[#7eb8c8] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#6aa9bb]"
              >
                Ücretsiz başla
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
