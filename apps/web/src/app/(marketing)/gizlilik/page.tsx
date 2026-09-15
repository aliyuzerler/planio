import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gizlilik politikası",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-8">
      <p className="text-sm font-medium tracking-wide text-[#6aa9bb]">Planio</p>
      <h1
        className="mt-2 text-3xl tracking-tight text-slate-900 sm:text-4xl"
        style={{ fontFamily: "var(--font-planio-display), serif" }}
      >
        Gizlilik politikası
      </h1>
      <p className="mt-2 text-sm text-slate-500">Son güncelleme: 13 Eylül 2026</p>

      <div className="mt-8 space-y-8 text-base leading-relaxed text-slate-700">
        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            1. Kapsam
          </h2>
          <p>
            Bu metin, Planio web uygulamasını kullanan işletme hesapları ve
            kullanıcıları için kişisel verilerin işlenmesine ilişkin özet
            bilgilendirmeyi içerir. Hizmeti kullanarak bu politikayı
            okuduğunuzu kabul etmiş sayılırsınız.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            2. İşlenen veriler
          </h2>
          <p>
            Hesap bilgileri (ad, e-posta), işletme profili, randevu ve müşteri
            kayıtları, satış / tahsilat kayıtları, teknik günlükler ve destek
            yazışmaları hizmetin sunulması için işlenebilir.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            3. Amaçlar
          </h2>
          <p>
            Veriler; hesabın oluşturulması, randevu ve işletme operasyonlarının
            yürütülmesi, abonelik ve ödeme süreçlerinin doğrulanması, güvenlik,
            yasal yükümlülükler ve destek taleplerinin yanıtlanması amacıyla
            kullanılır.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            4. Saklama ve güvenlik
          </h2>
          <p>
            Veriler, hizmet süresi ve yasal saklama yükümlülükleri boyunca
            muhafaza edilir. Erişim yetkileri role göre sınırlandırılır;
            iletimde şifreleme ve sunucu tarafı güvenlik önlemleri uygulanır.
            Kart numarası gibi hassas ödeme verileri Planio’da tutulmaz;
            ödeme sağlayıcısı üzerinden doğrulanır.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            5. Haklarınız
          </h2>
          <p>
            Kişisel verilerinize erişim, düzeltme, silme veya işleme itirazı
            taleplerinizi işletme sahibi hesabı üzerinden veya{" "}
            <a
              href="mailto:destek@planio.app"
              className="text-[#5a9aab] underline-offset-2 hover:underline"
            >
              destek@planio.app
            </a>{" "}
            adresine yazarak iletebilirsiniz. Talepler makul süre içinde
            değerlendirilir.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            6. İletişim
          </h2>
          <p>
            Gizlilik ile ilgili sorularınız için{" "}
            <Link
              href="/iletisim"
              className="text-[#5a9aab] underline-offset-2 hover:underline"
            >
              İletişim
            </Link>{" "}
            sayfasını kullanabilirsiniz.
          </p>
        </section>
      </div>
    </main>
  );
}
