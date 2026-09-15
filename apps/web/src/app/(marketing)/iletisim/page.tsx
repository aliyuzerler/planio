import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "İletişim",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-8">
      <p className="text-sm font-medium tracking-wide text-[#6aa9bb]">Planio</p>
      <h1
        className="mt-2 text-3xl tracking-tight text-slate-900 sm:text-4xl"
        style={{ fontFamily: "var(--font-planio-display), serif" }}
      >
        İletişim
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-700">
        Ürün, abonelik veya hesap konularında bize yazabilirsiniz. Mesajınızı
        mümkün olan en kısa sürede yanıtlarız.
      </p>

      <div className="mt-8 space-y-6 rounded-2xl border border-[#c5dde6]/70 bg-white p-6 sm:p-8">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-slate-900">E-posta</dt>
            <dd className="mt-1 text-slate-600">
              <a
                href="mailto:destek@planio.app"
                className="text-[#5a9aab] underline-offset-2 hover:underline"
              >
                destek@planio.app
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Konular</dt>
            <dd className="mt-1 text-slate-600">
              Hesap erişimi, abonelik, teknik destek, gizlilik talepleri
            </dd>
          </div>
        </dl>
        <a
          href="mailto:destek@planio.app?subject=Planio%20destek"
          className="inline-flex rounded-lg bg-[#7eb8c8] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6aa9bb]"
        >
          E-posta gönder
        </a>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="text-[#5a9aab] underline-offset-2 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </main>
  );
}
