# Planio — Canlıya Alma (Go-Live) Kontrol Listesi

Bu runbook, Planio'yu bir VPS'e kurup canlı trafiğe açmanın adım adım
sürecini içerir. Ayrıntılı arka plan: `docs/PRODUCTION.md`,
güvenlik politikası: `docs/SECURITY.md`.

## 0. Ön koşullar

- [ ] **Şifre rotasyonu tamamlandı** (kritik):
  - Supabase/Postgres veritabanı şifresi döndürüldü mü?
  - Gmail SMTP uygulama şifresi döndürüldü mü?
  - Yerel `.env` dosyalarında canlı şifre kalmadı mı?
- [ ] Sunucu: Ubuntu 22.04+ (4 GB RAM önerilir), Docker + Docker Compose
  kurulu, Node 22 + pnpm (migrasyon/bootstrap için).
- [ ] Alan adları hazır: `planio.com`, `admin.planio.com`, `api.planio.com`
  → sunucunun IP'sine A kayıtları.
- [ ] iyzico canlı üye işyeri hesabı onaylandı (API key/secret/merchant ID).
- [ ] (Önerilir) Veritabanı Türkiye'ye yakın bölgede: `ap-southeast-1`
  yerine `eu-central-1` vb. Uzak bölge her sorguya ~250 ms ekler.

## 1. Sunucu hazırlığı

```bash
# Depoyu sunucuya alın
git clone <repo-url> /opt/planio && cd /opt/planio
pnpm install --frozen-lockfile

# Güvenlik duvarı: yalnızca SSH/HTTP/HTTPS açık
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

## 2. Ortam değişkenleri

```bash
cp docker/.env.production.example docker/.env.production
```

`docker/.env.production` içindeki **her** değeri doldurun. Anahtar üretimi:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET (farklı olmalı)
openssl rand -base64 48   # CREDENTIALS_ENCRYPTION_KEY (farklı olmalı)
```

Kontrol listesi:
- [ ] `JWT_SECRET` ≠ `JWT_REFRESH_SECRET` ≠ `CREDENTIALS_ENCRYPTION_KEY`, hepsi ≥32 karakter
- [ ] `IYZICO_BASE_URL=https://api.iyzipay.com` (canlı) + gerçek iyzico anahtarları
- [ ] `STORAGE_DRIVER=s3` + bucket/anahtarlar (dosyalar sunucu diskine yazılmaz)
- [ ] SMTP/NetGSM/WhatsApp/FCM değerleri (isteğe bağlı ama e-posta doğrulaması için SMTP gerekli)
- [ ] `DATABASE_URL` `connection_limit` parametresi içeriyor

## 3. TLS sertifikası

```bash
sudo apt install certbot
sudo systemctl stop nginx 2>/dev/null || true
sudo certbot certonly --standalone \
  -d planio.com -d www.planio.com -d admin.planio.com -d api.planio.com
sudo mkdir -p docker/nginx/certs
sudo cp /etc/letsencrypt/live/planio.com/fullchain.pem docker/nginx/certs/
sudo cp /etc/letsencrypt/live/planio.com/privkey.pem  docker/nginx/certs/
```

Yenileme (crontab -e):

```
0 4 * * 1 certbot renew --quiet --deploy-hook "cd /opt/planio && docker compose --env-file docker/.env.production -f docker/docker-compose.prod.yml restart nginx"
```

## 4. Veritabanı migrasyonu ve ilk açılış

```bash
# Migrasyon (Postgres hostta 127.0.0.1:5432'de yayınlanır)
DATABASE_URL="postgresql://<user>:<parola>@localhost:5432/<db>" \
  pnpm --filter @xenior/database exec prisma migrate deploy

# Yığını başlat
cd docker && docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d && cd ..
```

## 5. Süper admin oluşturma

```bash
DATABASE_URL="postgresql://<user>:<parola>@localhost:5432/<db>" \
  SUPER_ADMIN_EMAIL=admin@planio.com \
  SUPER_ADMIN_GENERATE=1 \
  node scripts/ensure-super-admin.cjs
# Üretilen şifreyi parola yöneticisine kaydedin; ilk girişten sonra değiştirin.
```

## 6. Sağlık kontrolleri

```bash
curl -fsS https://api.planio.com/api/v1/health            # 200 {"status":"ok"}
curl -fsS https://api.planio.com/api/v1/health/ready      # 200 (DB + Redis hazır)
curl -fsSI https://planio.com                              # 200 + güvenlik başlıkları
curl -fsS https://planio.com/robots.txt                    # 200
curl -fsS https://planio.com/sitemap.xml                   # 200
```

`docker ps` ile tüm kapsayıcıların `healthy` olduğunu doğrulayın.

## 7. Canlı smoke testi (sırayla)

1. [ ] Kayıt formu → doğrulama e-postası geliyor → e-posta doğrulanıyor
2. [ ] Giriş → işletme oluşturma → dashboard açılıyor
3. [ ] Personel ekleme → davet e-postası → davet kabulü (yeni hesap)
4. [ ] Mevcut hesaba davet → mevcut parola isteniyor (güvenlik akışı)
5. [ ] Hizmet/müşteri/randevu oluşturma → takvimde görünüyor
6. [ ] POS/tezgah satışı → tahsilat → cari bakiye doğru
7. [ ] Abonelik satın alma (iyzico **sandbox** ile önce, sonra canlı küçük tutar)
8. [ ] iyzico webhook'u ulaşıyor (ödeme sonrası abonelik aktifleşiyor)
9. [ ] Şifremi unuttum akışı → sıfırlama → eski oturumlar geçersiz
10. [ ] Dosya yükleme (PDF/görsel) → indirilebiliyor; sahte dosya reddediliyor
11. [ ] Admin paneli (`admin.planio.com`) → süper admin girişi → metrikler

## 8. Yedekleme

```bash
# İlk yedeği elle alın ve restore testi yapın
cd /opt/planio
DATABASE_URL="postgresql://<user>:<parola>@localhost:5432/<db>" bash scripts/backup-postgres.sh
pg_restore --list backups/xenior-*.dump | head   # içerik okunuyor mu?
```

Cron (her gün 03:30 + S3'e kopya):

```
30 3 * * * cd /opt/planio && BACKUP_S3_URI=s3://<yedek-bucket> DATABASE_URL="postgresql://<user>:<parola>@localhost:5432/<db>" bash scripts/backup-postgres.sh >> /var/log/xenior-backup.log 2>&1
```

## 9. Rollback planı

- Önceki imajlar Docker'da durur: `docker images` →
  `docker compose --env-file docker/.env.production -f docker/docker-compose.prod.yml up -d --no-deps --build <servis>`
  yerine önceki tag ile ayağa kaldırma.
- Veritabanı geri dönüşü: migrasyonlar forward-only'dir. Sorunlu sürümde
  uygulama imajını geri alın; **migrasyonu geri almayın**. Veri bozulmasında:
  `pg_restore --clean --if-exists --dbname "<url>" backups/xenior-<stamp>.dump`.
- Sır kritik hata: iyzico webhook'ları tekrar deneme yapmazsa iyzico
  panelinden manual sync; kapsayıcı logları:
  `docker compose logs api --since 30m`.

## 10. Lansman sonrası öneriler (öncelik sırasıyla)

1. **Sentry** (API + web + admin) ve bir uptime servisi (UptimeRobot /
   healthchecks.io) — şu an yok, ilk öncelik.
2. Docker log rotasyonu (`/etc/docker/daemon.json` → `log-driver: json-file`,
   `max-size: 10m`, `max-file: 3`).
3. Admin uygulaması için Playwright e2e seti.
4. BUSINESS_OWNER ve SUPER_ADMIN için 2FA; sızan parola listesi kontrolü.
5. Katı CSP (nonce tabanlı) — proxy katmanına taşınabilir.
6. Yük testi (k6/artillery) — özellikle randevu takvim çekimleri.
7. Web korunan sayfalarının RSC'ye göçü (oturum şelalesini azaltır).
