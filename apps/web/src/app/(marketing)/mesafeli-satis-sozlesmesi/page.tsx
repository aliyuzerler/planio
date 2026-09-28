import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mesafeli satış sözleşmesi",
};

export default function DistanceSalesAgreementPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-8">
      <p className="text-sm font-medium tracking-wide text-[#6aa9bb]">Planio</p>
      <h1
        className="mt-2 text-3xl tracking-tight text-slate-900 sm:text-4xl"
        style={{ fontFamily: "var(--font-planio-display), serif" }}
      >
        Mesafeli satış sözleşmesi
      </h1>
      <p className="mt-2 text-sm text-slate-500">Son güncelleme: 18 Eylül 2026</p>

      <div className="mt-8 space-y-8 text-base leading-relaxed text-slate-700">
        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            1. Taraflar
          </h2>
          <p>
            İşbu Mesafeli Satış Sözleşmesi (“Sözleşme”), Planio abonelik
            hizmetini sunan sağlayıcı (“Satıcı”) ile abonelik satın alan işletme
            hesabı sahibi (“Alıcı”) arasında, elektronik ortamda kurulur.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            2. Konu
          </h2>
          <p>
            Sözleşmenin konusu; Alıcı’nın Planio işletme paneli abonelik
            planlarından birini seçerek dijital hizmete erişim hakkı satın
            alması ve bu hizmetin karşılığında bedelin ödenmesidir. Hizmet,
            seçilen planın kapsamındaki özelliklere göre sunulur.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            3. Hizmet ve bedel
          </h2>
          <p>
            Plan adı, faturalama dönemi (aylık, 6 aylık veya yıllık), fiyat ve
            para birimi ödeme ekranında Alıcı’ya gösterilir. Ödeme, iyzico
            Checkout Form üzerinden alınır; kart bilgileri Planio sistemlerinde
            saklanmaz.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            4. Teslimat
          </h2>
          <p>
            Abonelik dijital bir hizmet olduğundan, ödeme doğrulandıktan sonra
            Alıcı’nın işletme hesabında ilgili plan erişimi açılır. Fiziksel bir
            ürün teslimi yapılmaz.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            5. Cayma hakkı
          </h2>
          <p>
            Elektronik ortamda anında ifa edilen dijital aboneliklerde, hizmetin
            ifasına Alıcı’nın onayı ile başlanması halinde cayma hakkının
            kullanılamayacağı haller ilgili mevzuatta düzenlenmiştir. Abonelik
            iptali, mevcut faturalama dönemi sonunda geçerli olacak şekilde
            Planio ayarlarından talep edilebilir.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            6. Ödeme ve faturalama
          </h2>
          <p>
            Ödeme başarısız olursa abonelik aktifleştirilmez. Başarılı ödemeler
            Planio ödeme kayıtlarında görünür. Resmi fatura/irsaliye süreçleri
            işletmenin entegrasyon ayarlarına göre ayrıca yürütülebilir.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            7. Yürürlük
          </h2>
          <p>
            Alıcı, ödeme formundaki onay kutucuğunu işaretleyerek işbu sözleşmeyi
            okuduğunu ve kabul ettiğini beyan eder. Sözleşme, ödeme işleminin
            başlatılması ile birlikte yürürlüğe girer.
          </p>
        </section>

        <section className="space-y-3">
          <h2
            className="text-xl text-slate-900"
            style={{ fontFamily: "var(--font-planio-display), serif" }}
          >
            8. İletişim
          </h2>
          <p>
            Sözleşme ve abonelik ile ilgili talepleriniz için{" "}
            <Link
              href="/iletisim"
              className="text-[#5a9aab] underline-offset-2 hover:underline"
            >
              İletişim
            </Link>{" "}
            sayfasını veya{" "}
            <a
              href="mailto:destek@planio.app"
              className="text-[#5a9aab] underline-offset-2 hover:underline"
            >
              destek@planio.app
            </a>{" "}
            adresini kullanabilirsiniz.
          </p>
        </section>
      </div>
    </main>
  );
}
