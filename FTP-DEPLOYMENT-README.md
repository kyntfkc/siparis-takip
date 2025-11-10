# 🚀 FTP Sunucusuna Deployment - Hızlı Başlangıç

Bu rehber, Sipariş Takip sistemini kendi FTP sunucunuza kurmanız için gerekli tüm adımları içerir.

## 📦 Hazırlanan Dosyalar

Kurulum için şu dosyalar hazırlandı:

1. **deployment-guide.md** - Detaylı kurulum rehberi
2. **FTP-UPLOAD-CHECKLIST.md** - FTP'ye yüklenecek/yüklenmeyecek dosya listesi
3. **quick-start.sh** - Otomatik kurulum script'i (SSH'den çalıştırılır)
4. **deploy.sh** - Güncelleme deployment script'i
5. **nginx-config.conf** - Nginx yapılandırma dosyası
6. **ecosystem.config.js** - PM2 yapılandırma dosyası
7. **env-production-template.txt** - Environment variables şablonu

---

## ⚡ Hızlı Kurulum (3 Adımda)

### 1️⃣ FTP ile Dosya Yükleme

**Yüklenecekler:**
```
✅ backend/ (node_modules ve dist hariç)
✅ frontend/ (node_modules ve dist hariç)
✅ quick-start.sh
✅ deploy.sh
✅ ecosystem.config.js
✅ nginx-config.conf
✅ deployment-guide.md
✅ FTP-UPLOAD-CHECKLIST.md
✅ env-production-template.txt
```

**Yüklenmeyecekler:**
```
❌ node_modules/
❌ dist/
❌ .git/
❌ database.json
❌ .env
❌ *.log
```

**Hedef dizin:** `/var/www/siparis-takip/`

### 2️⃣ SSH ile Bağlanın

```bash
ssh your-user@your-server.com
cd /var/www/siparis-takip
```

### 3️⃣ Quick Start Script'i Çalıştırın

```bash
chmod +x quick-start.sh
./quick-start.sh
```

Script otomatik olarak:
- Node.js, PM2, Nginx kurulumunu yapar
- Gerekli dizinleri oluşturur
- .env dosyasını oluşturmanızı ister
- Backend ve frontend'i build eder
- PM2 ile backend'i başlatır
- Nginx yapılandırması için talimat verir

---

## 🔧 Manuel Kurulum (Adım Adım)

Otomatik script kullanmak istemiyorsanız:

### 1. Sistem Gereksinimleri

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt-get install -y nginx
```

### 2. Dizin Hazırlığı

```bash
cd /var/www/siparis-takip
mkdir -p data logs
chmod -R 777 data logs
```

### 3. Backend .env Oluştur

```bash
cd backend
nano .env
```

`env-production-template.txt` içeriğini kopyalayıp yapıştırın.

**Önemli:** Şu değerleri kontrol edin:
- `TRENDYOL_SUPPLIER_ID=490931`
- `TRENDYOL_API_KEY=8Zo4QEhUIxRELgH80Gip`
- `TRENDYOL_API_SECRET=aWlScHJHRkFGcmdJWUtRT3d2c0NZSlRZ`

### 4. Build ve Başlatma

```bash
# Backend
cd /var/www/siparis-takip/backend
npm install
npm run build

# Frontend
cd /var/www/siparis-takip/frontend
npm install
npm run build

# PM2 ile başlat
cd /var/www/siparis-takip
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginx Yapılandırması

```bash
# Config'i kopyala
sudo cp nginx-config.conf /etc/nginx/sites-available/siparis-takip

# Config'i düzenle (server_name değiştir)
sudo nano /etc/nginx/sites-available/siparis-takip

# Aktif et
sudo ln -s /etc/nginx/sites-available/siparis-takip /etc/nginx/sites-enabled/

# Test et
sudo nginx -t

# Restart et
sudo systemctl restart nginx
```

---

## 🌐 Trendyol IP Whitelist

### Sunucu IP'nizi öğrenin:

```bash
curl ifconfig.me
```

### Trendyol Paneline Ekleyin:

1. https://partner.trendyol.com → Entegrasyon
2. API Ayarları
3. IP Whitelist
4. Sunucu IP'nizi ekleyin
5. Kaydedin

---

## ✅ Test ve Doğrulama

### 1. Backend Durumu

```bash
pm2 status
pm2 logs siparis-backend
```

Şunları görmelisiniz:
- ✅ `Server running on http://0.0.0.0:3001`
- ✅ `Database başlatıldı`
- ✅ `Trendyol sync başladı`

### 2. Frontend Erişimi

Tarayıcıda açın:
```
http://YOUR_SERVER_IP
```

### 3. API Test

```bash
curl http://localhost:3001/api/siparisler
```

### 4. Trendyol Sync Test

```bash
# Manuel sync tetikle
curl http://localhost:3001/api/trendyol/sync

# Logları izle
pm2 logs siparis-backend --lines 50
```

---

## 🔄 Güncelleme Yapmak

### FTP ile yeni dosyaları yükledikten sonra:

```bash
ssh your-user@your-server.com
cd /var/www/siparis-takip
./deploy.sh
```

Bu script otomatik olarak:
1. Backend'i build eder
2. Frontend'i build eder
3. PM2'yi restart eder

---

## 📊 PM2 Komutları

```bash
# Status
pm2 status

# Logları göster
pm2 logs siparis-backend

# Belirli sayıda log göster
pm2 logs siparis-backend --lines 100

# Restart
pm2 restart siparis-backend

# Stop
pm2 stop siparis-backend

# Start
pm2 start siparis-backend

# Tüm PM2 process'leri sıfırla
pm2 delete all
pm2 start ecosystem.config.js
```

---

## 🔍 Sorun Giderme

### Backend Başlamıyor

```bash
# Logları kontrol et
pm2 logs siparis-backend --err

# .env dosyasını kontrol et
cat backend/.env

# Manuel başlat (debug için)
cd backend
node dist/index.js
```

### Frontend 404 Hatası

```bash
# Build klasörü var mı?
ls -la frontend/dist/

# Nginx config doğru mu?
sudo nginx -t

# Nginx logları
sudo tail -f /var/log/nginx/siparis-takip-error.log
```

### Trendyol 401 Unauthorized

```bash
# IP whitelist kontrol et
curl ifconfig.me

# .env credentials kontrol et
cat backend/.env | grep TRENDYOL

# Trendyol panelinde IP'nin ekli olduğunu doğrula
```

### Database Yazma Hatası

```bash
# İzinleri kontrol et
ls -la data/

# İzinleri düzelt
chmod -R 777 data/
```

### Port 3001 Kullanımda

```bash
# Kim kullanıyor?
sudo lsof -i :3001

# Kill et
kill -9 PID
```

---

## 🔐 Güvenlik Önerileri

### 1. Firewall Ayarları

```bash
# UFW kur (eğer yoksa)
sudo apt-get install ufw

# SSH izin ver (bağlantınız kopmasın!)
sudo ufw allow 22

# HTTP/HTTPS izin ver
sudo ufw allow 80
sudo ufw allow 443

# Aktif et
sudo ufw enable
```

### 2. SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kur
sudo apt-get install certbot python3-certbot-nginx

# SSL sertifikası al (domain adınız varsa)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Otomatik yenileme test et
sudo certbot renew --dry-run
```

### 3. Database Backup

```bash
# Crontab ekle
crontab -e

# Her gece 2'de backup al
0 2 * * * cp /var/www/siparis-takip/data/database.json /var/www/siparis-takip/data/backup-$(date +\%Y\%m\%d).json

# Eski backup'ları temizle (30 günden eski)
0 3 * * * find /var/www/siparis-takip/data/backup-*.json -mtime +30 -delete
```

---

## 📞 İletişim ve Destek

Sorun yaşarsanız:

1. **Logları kontrol edin:** `pm2 logs siparis-backend`
2. **deployment-guide.md** dosyasına bakın
3. **FTP-UPLOAD-CHECKLIST.md** ile dosyaları kontrol edin

---

## 🎉 Başarıyla Kuruldu!

Artık kendi sunucunuzda çalışan bir sipariş takip sisteminiz var:

✅ Sabit IP adresi → Trendyol entegrasyonu çalışır
✅ Tam kontrol → Environment variables, database, logs
✅ Maliyet kontrolü → Kendi sunucunuz
✅ Hızlı sync → Direkt Trendyol API erişimi

**İyi çalışmalar!** 🚀

