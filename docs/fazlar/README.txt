XENIOR FAZ PLANI — INDEKS
=========================

Klasor: docs/fazlar/
Kaynak: PDF mimari + Xenior mevcut kod + 8 Eylul 2026 kilitli kararlar

SIRA (birlikte bu sirayla baslanacak)
-------------------------------------
0. 00-kilitli-kararlar.txt     Kilidi acmadan kod yazma
1. faz-00-omurga.txt           Paywall, personel saatleri, muhasebe rolu semasi
2. faz-01-ajanda.txt           Takvim DnD, oda/koltuk, personel kendi ajandasi
3. faz-02-lisans.txt           6 aylik paket, admin plan, paywall UI
4. faz-03-crm.txt              Musteri dosya arsivi, cari iskelet
5. faz-04-kampanya.txt         Indirim / fiyat motoru
6. faz-05-prim.txt             Personel prim kurallari
7. faz-06-kasa.txt             On muhasebe + dahili satis fisi
8. faz-07-tahsilat.txt         Isletme POS, odeme linki, kapora / tam / gununde
9. faz-08-efatura-sms.txt      Uyumsoft e-Fatura/SMM + toplu SMS
10. faz-09-mobil-rapor.txt     Mobil, rapor, cilalama

BAGIMLILIK
----------
Faz 0 -> 1, 2, 3 paralel olabilir.
Faz 4, fiyat snapshot icin 1'den sonra.
Faz 5, complete hook icin 1'den sonra; kasa ile 6'ya baglanir.
Faz 6 OLMADAN 7 ve 8 YAPILMAZ.
Faz 7 odeme turlerini randevuya baglar (kapora / tam / gununde).
Faz 8 hem dahili fisi (6) hem Uyumsoft'u kullanir.

STOK
----
Ilk surumde stok YOKTUR. Urun satisi ileride dusunulur; Faz 6 hizmet satisi + istege bagli urun fiyati stoksuz olabilir, adet/depo yok.
