# Xenior × PDF Mimari Karşılaştırma ve Faz Planı

**Kaynak PDF:** `Randevu_ve_On_Muhasebe_SaaS_Sistem_Mimarisi.pdf` (Eylül 2026)  
**Hedef ürün (PDF):** Çok kiracılı, randevu + ön muhasebe SaaS  
**Mevcut ürün (Xenior):** Çok kiracılı güzellik merkezi randevu + abonelik SaaS  

Bu rapor PDF’deki her modülü mevcut Xenior koduyla karşılaştırır, **uyumlu / ekstra / değişmesi gereken** noktaları ayırır ve işi fazlara böler.

---

## 1. Tek bakışta özet

| Alan | PDF | Xenior bugün | Sonuç |
|------|-----|--------------|--------|
| Multi-tenant SaaS | Var | Var (`Business` + `X-Business-Id`) | Uyumlu |
| Süper Admin / lisans | Tenant oluşturma, 6 aylık paket, otomatik dondurma | Admin paneli + iyzico abonelik; self-register; aylık/yıllık | Kısmen uyumlu |
| Roller | Sahip / Muhasebe / Personel | `BUSINESS_OWNER` / `BUSINESS_ADMIN` / `STAFF` | `ACCOUNTANT` eklenecek (kilitli) |
| Ajanda | DnD, oda/masa, Bekliyor durumu | Takvim + CRUD; DnD yok; oda yok; `CONFIRMED` ile başlar | Kısmen uyumlu |
| CRM | Cari + dosya arşivi | Müşteri kartı + randevu geçmişi + rıza | Eksik: cari, dosya |
| Personel | Vardiya, izin, prim | Profil, uzmanlık, davet; `StaffHours` şema-only | Eksik: prim, izin |
| Kampanya | Tarih / ürün / yüzde | Yok | Yeni modül |
| Ön muhasebe | Kasa, satış, gider, açık hesap | Yok (yalnızca Xenior abonelik ödemesi) | En büyük boşluk |
| Entegrasyon Hub | NetGSM, Uyumsoft, işletme POS, kapora | NetGSM / WhatsApp / SMTP / FCM kurulumu; iyzico **yalnızca Xenior aboneliği** | Kısmen uyumlu |
| Müşteri self-booking | PDF’de açık yok; kapora “randevu alma aşaması” | Müşteri randevu oluşturamaz | Korunur; kapora/tam/gününde işletme seçer (kilitli) |

**Uygulama belgeleri:** Kararlar kilitlendi. Faz kapsamları `docs/fazlar/` altındadır (`README.txt` indeks).

**Sonuç:** Xenior, PDF’nin **randevu + lisans + bildirim** çekirdeğine yakın. PDF’nin asıl ekstra katmanı **ön muhasebe, prim, kampanya, işletme POS’u, e-fatura ve CRM cari/arşiv**. Bunlar mevcut mimariye eklenebilir.

---

## 2. Mevcut Xenior omurgası (korunacak)

Rapor boyunca yeni işler bu omurgaya oturur; yeniden yazılmaz.

- **Repo:** pnpm + Turborepo — `apps/api` (NestJS `/api/v1`), `apps/web` (3000), `apps/admin` (3002), `apps/mobile` (Flutter)
- **Kiracı:** `Business` kökü, `BusinessUser` üyelik, header `X-Business-Id`
- **Kimlik:** JWT + refresh rotation, davet / doğrulama / şifre sıfırlama
- **Randevu:** yalnızca işletme kullanıcısı oluşturur; durumlar `CONFIRMED` / `COMPLETED` / `CANCELLED` / `NO_SHOW`; personel çakışması yasak
- **Bildirim:** kuyruk (BullMQ); NetGSM / Meta WhatsApp / SMTP / FCM; tenant kimlik bilgisi şifreli; panelden kurulum + test
- **Xenior geliri:** iyzico abonelik (Starter / Professional, aylık-yıllık); kayıtta 14 gün `TRIALING`
- **KVKK iskeleti:** rıza, export, silme talebi; denetim kaydı

---

## 3. Modül bazlı karşılaştırma

### 3.1 Lisans ve SaaS yönetimi (Süper Admin)

| PDF | Xenior | Gap |
|-----|--------|-----|
| Tenant oluşturma + profil | İşletme self-register; admin işletmeyi listeler / `ACTIVE`–`SUSPENDED`–`CLOSED` | Admin’den “işletme oluştur” yok |
| Paket: aylık, **6 aylık**, yıllık | `MONTHLY` / `YEARLY` | 6 aylık dönem yok |
| Süre takibi, otomatik yenileme, dolunca kısıtlama | iyzico recurring + `EXPIRED`; limitler staff/customer create’te | Global paywall (`assertCanUseBusiness`) tanımlı ama **çağrılmıyor** |
| Plan fiyatı panelden | DB `Plan` + admin iyzico `externalPricingPlanCode` | Fiyat/6 aylık plan CRUD UI zayıf |

**Kilitli:** 6 aylık paket eklenecek (`BillingPeriod.SEMIANNUAL`). Ayrıntı: `docs/fazlar/faz-02-lisans.txt`.

### 3.2 Yetkilendirme ve roller

| PDF | Xenior | Gap |
|-----|--------|-----|
| İşletme Sahibi = full admin | `BUSINESS_OWNER` | Uyumlu |
| **Muhasebe** = yalnızca finans / e-fatura / cari | `BUSINESS_ADMIN` = operasyon yazma (personel, hizmet, müşteri, randevu) | Muhasebe rolü yok; ADMIN operasyonel |
| Personel = kendi ajandası, kendi satışları, prim, profil | `STAFF` randevu yazabilir; katalog çoğunlukla salt okunur; **tüm takvimi** görür | Kendi ajandasına kısıtlama yok; satış/prim yok |

**Kilitli:** Yeni `ACCOUNTANT` rolü. `BUSINESS_ADMIN` operasyon yardımcısı olarak kalır. İşletme personele hesap açar; o hesapla girişte yalnızca muhasebe/finans yerleri görünür. Ayrıntı: `docs/fazlar/00-kilitli-kararlar.txt`.

### 3.3 Dinamik randevu ve ajanda

| PDF | Xenior | Gap |
|-----|--------|-----|
| Günlük / haftalık / aylık görsel takvim | Web gün/hafta takvim; mobil gün | Aylık görünüm yok |
| Sürükle-bırak | Yok | Yeni |
| Müşteri + hizmet/ürün + personel + **oda/masa** | Müşteri + hizmet + personel | Oda/kaynak yok; ürün satışı randevuda yok |
| Çakışma + esnek saat | Personel overlap + isteğe bağlı `BusinessHours` | Personel saatleri UI’sız (`StaffHours`) |
| Durum: Bekliyor, Onaylandı, Tamamlandı, İptal | `CONFIRMED` (oluşunca), `COMPLETED`, `CANCELLED`, `NO_SHOW` | **Bekliyor yok**; `NO_SHOW` PDF’de yok (Xenior ekstra, korunmalı) |

**Kilitli:** `PENDING` / Bekliyor eklenmez. Randevu işletme tarafından `CONFIRMED` açılır. Kapora/tam/gününde ödeme **ayrı alan**dır (`paymentStatus`), randevu durumu değildir.

### 3.4 CRM ve dosya yönetimi

| PDF | Xenior | Gap |
|-----|--------|-----|
| Kart, iletişim, geçmiş hizmet/randevu | Var | Uyumlu |
| Açık hesap / cari / taksit / parça ödeme | Yok | Yeni (ön muhasebeye bağlı) |
| Islak imza, KVKK belgesi, PDF/görsel arşiv | Rıza boolean + `PrivacyConsent` kaydı; dosya yok | Object storage + `CustomerFile` |

### 3.5 Personel ve prim

| PDF | Xenior | Gap |
|-----|--------|-----|
| Çalışma saati, vardiya, izin | `StaffHours` tablo; API/UI yok | CRUD + vardiya/izin modelleri |
| Hizmet/ürün bazlı sabit veya % prim, aç/kapa | Yok | Yeni kural motoru |
| Tamamlanan randevu / satıştan otomatik prim | `COMPLETED` event var; prim yok | Appointment complete hook |
| Maaş/prim gider kaydı | Yok | Ön muhasebe gideri |

### 3.6 Kampanya ve fiyatlandırma

PDF’de tarih aralığı, seçili hizmet/ürün/kategori, tutar/%, randevu ve kasada otomatik uygulama var. Xenior’da **hiç yok**. Hizmet fiyatı sabittir; randevuda snapshot alınır.

### 3.7 Ön muhasebe ve kasa (en büyük boşluk)

PDF çekirdeği Xenior’da model/API/UI olarak yok:

- Ürün kataloğu (**stok v1’de yok**; sonra)
- Tekil ürün satışı veya randevuya bağlı tahsilat
- Kasa / banka (nakit, POS, havale)
- Gider (kira, fatura, malzeme) + maaş/prim ödeme
- Açık hesap, parçalı tahsilat

Xenior’daki `Payment` yalnızca **platform aboneliği** içindir; müşteri tahsilatı değildir. Karışmamalı: iki ayrı ödeme dünyası.

```
Xenior Payment     → Plan / Subscription / iyzico (platform geliri)
Tenant tahsilat    → Sale / Collection / CashAccount (işletme kasası)
```

### 3.8 Entegrasyon Hub

| PDF | Xenior | Gap |
|-----|--------|-----|
| İşletme kendi API anahtarını girer | Bildirimler sayfası: NetGSM, WhatsApp, SMTP | Kalıp doğru; finans entegrasyonları yok |
| A. Uyumsoft e-Fatura / SMM | Yok | Yeni |
| B. İşletme sanal POS (iyzico, Akbank…) | iyzico var ama **Xenior aboneliği** için | Tenant POS + ödeme linki + kapora + manuel POS |
| C. NetGSM hatırlatma + **toplu kampanya SMS** | Otomatik randevu SMS/hatırlatma var | Toplu/kampanya gönderimi yok |

**Kilitli kural değişikliği:** Kapora / tamamı / randevu günü ödeme işletme seçer (müşteri isteğine göre). Xenior abonelik iyzico’su ayrı kalır. `PRODUCT.md` Faz 0’da güncellenir. Ayrıntı: `docs/fazlar/faz-07-tahsilat.txt`.

### 3.9 PDF’deki örnek uçtan uca akış

| Adım | PDF | Xenior |
|------|-----|--------|
| 1 Yapılandırma | NetGSM + Uyumsoft + banka POS | NetGSM (ve WA/SMTP) kaydı var |
| 2 Randevu & SMS | Takvime işle → onay + hatırlatma SMS | Var (ayar + rıza açıksa) |
| 3 Hizmet & prim | Complete → prim | Complete var; prim yok |
| 4 Tahsilat | POS/nakit → kasa | Yok |
| 5 Fatura | Uyumsoft e-Fatura/SMM | Yok |

---

## 4. Karar listesi — KİLİTLİ (8 Eylül 2026)

Kaynak: `docs/fazlar/00-kilitli-kararlar.txt`. Bu maddeler kod yazılırken değişmez.

1. **Muhasebe rolü:** Yeni `ACCOUNTANT`. İşletme personele hesap açar; girişte yalnızca kasa/satış/tahsilat/cari/gider/e-belge. `BUSINESS_ADMIN` operasyon yardımcısı kalır.
2. **Randevu `PENDING`:** Hayır. Durumlar: `CONFIRMED` / `COMPLETED` / `CANCELLED` / `NO_SHOW`. Ödeme durumu ayrı alandır.
3. **Kapora / randevu tahsilatı:** Evet. Müşteri isteğine göre işletme seçer: kapora, tamamı, veya randevu günü.
4. **Müşteri self-booking:** Hayır. Randevuyu yalnızca işletme oluşturur.
5. **6 aylık lisans:** Evet, `BillingPeriod.SEMIANNUAL`. Fiyat kodda sabit değil.
6. **Oda/masa:** Evet, isteğe bağlı `Resource` (Faz 1).
7. **Tenant POS vs Xenior iyzico:** Ayrı. Platform aboneliği ≠ işletme kasası.
8. **E-fatura:** İkisi de. Dahili satış fişi (Faz 6) + Uyumsoft e-Fatura/SMM (Faz 8).
9. **Stok:** İlk sürümde yok. Sonra düşünülür.

---

## 5. Faz planı

Her faz: hedef, kapsam, teslim, bilinçli olarak dışarıda bırakılan.

### Faz 0 — Ürün hizalama ve omurga (1–3 gün)

**Hedef:** PDF ile Xenior kurallarını yazıya dökmek; teknik borçları kapatmak.

- `PRODUCT.md` güncelle: mevcut gerçek özellikler + PDF’den kabul edilen ekstra kurallar
- Global paywall: `assertCanUseBusiness` randevu/satış/yazma yollarına
- `StaffHours` API + web UI (işletme saatleri kalıbı)
- Bildirim şablonu (`NotificationTemplate`) CRUD veya bilinçli “hardcoded bırak” kararı
- Admin: süresi dolmuş / askıdaki işletmeyi net gösterme

**Dışarıda:** muhasebe, prim, POS.

**Teslim:** Süresi biten işletme yazamaz; personel saatleri panelden girilir.

---

### Faz 1 — Ajandayı PDF’e yaklaştır

**Hedef:** Operasyonel takvimi PDF’deki “ana modül” seviyesine getir.

- Aylık takvim görünümü
- Sürükle-bırak ile saat/personel değiştirme (mevcut reschedule API)
- İsteğe bağlı `Resource` (oda/koltuk): işletme tanımlar, randevuya bağlanır, kaynak çakışması
- Personel rolünde “yalnızca kendi ajandam” filtresi (ayar veya rol politikası)
- `NO_SHOW` korunur; Bekliyor eklenmez (karar 2)

**Dışarıda:** ürün satışı randevu kartında (Faz 5).

**Teslim:** Web takvim DnD + oda ataması; mobil en az kaynak alanı.

---

### Faz 2 — Süper Admin lisans tamamlayıcıları

**Hedef:** PDF §1’i admin panelinde kapatmak.

- `SEMIANNUAL` faturalama + plan seed (fiyat DB’den)
- Admin’den plan oluştur/güncelle (fiyat, limit, dönem, iyzico kodu)
- Admin’den işletme oluşturma (opsiyonel; self-register durur)
- Abonelik bitince otomatik `EXPIRED` + UI paywall (web + mobil salt okunur)
- 6 aylık iyzico `externalPricingPlanCode` eşlemesi

**Dışarıda:** 6 aylık dışında özel lisans tipleri.

---

### Faz 3 — CRM: cari iskeleti + dijital arşiv

**Hedef:** Müşteri kartını PDF §4’e taşımak (tahsilat motoru henüz sığ).

- `CustomerFile` + S3/uyumlu object storage (PDF/görsel, KVKK belgesi tipi)
- Müşteri detayında dosya listesi / yükleme (owner, admin, accountant)
- Cari bakiye **okuma modeli** (hareketler Faz 5’te dolar; şimdilik 0)
- Mobilde rıza kutuları (web’de var)

**Dışarıda:** taksit motoru (Faz 5 parçalı tahsilat).

---

### Faz 4 — Kampanya ve fiyat motoru

**Hedef:** PDF §6.

- `Campaign`: tarih aralığı, yüzde/tutar, hedef hizmet/ürün/kategori, aktif bayrak
- Fiyat çözümleyici: randevu oluşturma + (sonra) kasa
- Snapshot’a `listPrice` + `discountAmount` + `campaignId`
- Kampanya SMS’i için altyapı kancası (gönderim Faz 6 toplu SMS)

**Teslim:** Seçili hizmette kampanya otomatik düşer; kasa aynı motoru kullanır.

---

### Faz 5 — Personel prim

**Hedef:** PDF §5 prim; vardiya/izin sade.

- `CommissionRule` (hizmet/ürün, sabit veya %, aç/kapa)
- `CommissionEntry` — randevu `COMPLETED` veya satış oluşunca
- Personel ekranı: hakediş listesi (STAFF yalnız kendi)
- İzin günü + basit vardiya (opsiyonel, primden sonra)

**Teslim:** Tamamlanan manikür → kurala göre prim satırı.

---

### Faz 6 — Ön muhasebe çekirdeği (kasa)

**Hedef:** PDF §7; Xenior’u “randevu + kasa” yap. **Dahili satış fişi bu fazda.** Uyumsoft Faz 8. Stok yok.

Yeni bounded context, mevcut `Payment` (abonelik) ile karışmaz.

**Modeller (öneri):** `CashAccount`, `Sale`, `SaleLine`, `Collection`, `Expense`, `CustomerLedgerEntry`, `SalesReceipt`

**Akış:**

1. Hizmet/ürün satışı (randevuya bağlı veya tezgâh)
2. Tahsilat: nakit / (sonra) POS / havale; parçalı ödeme
3. Açık hesap = satış − tahsilat
4. Gider: kira, fatura, malzeme, maaş/prim ödeme
5. Kasa/banka bakiyesi

**Roller:** `ACCOUNTANT` + `BUSINESS_OWNER` yazma; `STAFF` kendi satışına bakma.

**UI:** web `Kasa`, `Satışlar`, `Giderler`, `Cari`; dashboard’a nakit özeti.

**Dışarıda:** Uyumsoft, tenant POS, kapora linki.

**Teslim:** Randevu tamamla → satış fişi → nakit tahsilat → kasa + cari güncellenir.

---

### Faz 7 — Entegrasyon Hub: işletme tahsilatı

**Hedef:** PDF §8.B (kapora kararı evet ise).

- Hub’ı Bildirimler’den ayır: `Ayarlar → Entegrasyonlar`
- Tenant iyzico (veya sanal POS) kimlik bilgisi, şifreli (NetGSM kalıbı)
- Ödeme linki SMS/e-posta
- Manuel POS tahsilat ekranı (muhasebe/sahip)
- Kapora / tam / gününde: randevu oluştururken işletme seçer; ödeme olmasa da `CONFIRMED` açılabilir
- Xenior abonelik iyzico’su **ayrı kalır**

**Teslim:** Müşteriye link gider; ödeme işletme hesabına; `Collection` oluşur.

---

### Faz 8 — Toplu SMS + Uyumsoft e-fatura/SMM

**Hedef:** PDF §8.A ve §8.C kampanya SMS.

- NetGSM ile segment/kampanya toplu gönderim (rıza + rate limit + log)
- Uyumsoft kimlik bilgisi Hub’da
- Satış/tahsilattan “Fatura kes” → e-Fatura veya SMM
- Belge no müşteriye e-posta/SMS

**Teslim:** PDF Adım 5 çalışır.

---

### Faz 9 — Mobil, rapor, cilalama

- Mobil: kasa salt okunur veya sade tahsilat; prim; dosya listesi
- Finansal özet: günlük kasa, cari alacak, prim, gider (P&L sade)
- Admin: platform GMV yok (tenant finansı karışmaz); lisans metrikleri
- KVKK erase job; tenant denetim görünümü
- `docs/API.md` / `ARCHITECTURE.md` senkronu

---

## 6. Faz sırası ve bağımlılık

```
Faz 0  omurga / paywall / personel saatleri
  ├─ Faz 1  ajanda (DnD, oda)
  ├─ Faz 2  lisans (6 aylık, admin plan)
  └─ Faz 3  CRM dosya
        │
        ▼
Faz 4  kampanya (fiyat motoru)
        │
        ▼
Faz 5  prim  ──►  Faz 6  kasa / satış / cari / gider
                        │
                        ├─ Faz 7  tenant POS + link + kapora
                        └─ Faz 8  toplu SMS + Uyumsoft
                                  │
                                  ▼
                                Faz 9  mobil + rapor
```

Faz 6 olmadan 7 ve 8 yapılmamalı (tahsilat ve fatura bağlanacak satış/kasa yok).

---

## 7. Tahmini büyüklük (kaba)

| Faz | Büyüklük | Risk |
|-----|----------|------|
| 0 | S | Düşük |
| 1 | M | Orta (takvim UX) |
| 2 | S–M | Düşük |
| 3 | M | Orta (dosya/storage) |
| 4 | M | Orta (fiyat tutarlılığı) |
| 5 | M | Orta |
| 6 | **L** | Yüksek (yeni domain, para) |
| 7 | L | Yüksek (PCI/iyzico tenant, kapora kuralı) |
| 8 | L | Yüksek (Uyumsoft, yasal belge) |
| 9 | M | Düşük |

Para ve yasal belge içeren 6–8, randevu çekirdeğinden daha riskli; ayrı test ve tenant izolasyonu şart.

---

## 8. Bilinçli olarak PDF dışında bırakılan / sonraya

- Çok şube (PDF zorunlu kılmıyor; Xenior tek `Business`)
- Müşteri self-servis rezervasyon portalı
- Stok (v1 dışı; depo, lot, barkod, adet düşümü)
- Tam muhasebe (muhasebe fişi, KDV beyannamesi, banka mutabakatı otomasyonu)
- Akbank’a özel POS — generic “tenant sanal POS” yeterli
- Flutter’da tam kasa (önce web)

---

## 9. Uygulama sırası

Faz belgeleri: `docs/fazlar/`. İlk kod: **Faz 0** (`faz-00-omurga.txt`).

---

## 10. Kaynak dosyalar (mevcut)

- Şema: `packages/database/prisma/schema.prisma`
- Randevu: `apps/api/src/appointments/`
- Bildirim kurulumu: `apps/web/src/app/(protected)/settings/notifications/`
- Abonelik: `apps/api/src/subscriptions/`, `apps/api/src/payments/`
- Admin: `apps/admin/src/app/(protected)/`
- Ürün kuralları: `docs/PRODUCT.md` (kısmen güncel değil; Faz 0’da güncellenecek)
- Faz belgeleri: `docs/fazlar/` (kilitli kararlar + faz-00 … faz-09)
