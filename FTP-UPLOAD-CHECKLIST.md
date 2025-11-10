# 📦 FTP'ye Yüklenecek Dosyalar

## ✅ YÜKLENMESİ GEREKENLER

### Backend Klasörü (`/backend`)
```
backend/
├── src/                    # Tüm source kodlar
├── package.json            # Backend dependencies
├── package-lock.json       # Lock file
├── tsconfig.json          # TypeScript config
└── .env                   # ❌ YÜKLEME! Sunucuda oluşturacağız
```

### Frontend Klasörü (`/frontend`)
```
frontend/
├── src/                   # Tüm source kodlar
├── public/                # Public assets
├── index.html            # HTML template
├── package.json          # Frontend dependencies
├── package-lock.json     # Lock file
├── tsconfig.json         # TypeScript config
├── tsconfig.node.json    # Node TypeScript config
├── vite.config.ts        # Vite config
└── tailwind.config.js    # Tailwind config
```

### Root Dosyalar
```
/
├── deploy.sh             # Deployment script
├── deployment-guide.md   # Kurulum rehberi
└── env-production-template.txt  # .env şablonu
```

---

## ❌ YÜKLENMEYECEKLER (Gereksiz/Zararlı)

### 1. Node Modules
```
❌ backend/node_modules/
❌ frontend/node_modules/
```
**Neden?** Sunucuda `npm install` ile yüklenecek

### 2. Git Dosyaları
```
❌ .git/
❌ .gitignore
```
**Neden?** Sadece Git için gerekli

### 3. Build Dosyaları (Sunucuda build edilecek)
```
❌ backend/dist/
❌ frontend/dist/
```
**Neden?** Sunucuda `npm run build` ile oluşacak

### 4. Database ve Logs
```
❌ backend/database.json
❌ backend/data/
❌ data/
❌ *.log
```
**Neden?** Sunucuda yeni database başlayacak

### 5. Environment Files
```
❌ backend/.env
❌ .env
❌ .env.local
```
**Neden?** Sunucuda manuel oluşturacağız (güvenlik)

### 6. IDE ve Test Dosyaları
```
❌ .vscode/
❌ .idea/
❌ *.test.ts
❌ *.spec.ts
❌ coverage/
```

### 7. Railway Dosyaları
```
❌ railway.json
❌ railway.toml
```

### 8. Windows/Mac Sistem Dosyaları
```
❌ Thumbs.db
❌ .DS_Store
❌ desktop.ini
```

---

## 📋 FTP Yükleme Adımları

### 1. FTP Bağlantısı
```
Host: ftp.your-server.com
Username: your-username
Password: your-password
Port: 21 (veya 22 SFTP için)
```

### 2. Hedef Dizin Oluştur
FTP'de şu klasörü oluşturun:
```
/var/www/siparis-takip/
```

### 3. Dosyaları Yükle
- `backend/` klasörünü yükle (node_modules hariç)
- `frontend/` klasörünü yükle (node_modules ve dist hariç)
- `deploy.sh` dosyasını yükle
- `deployment-guide.md` dosyasını yükle
- `env-production-template.txt` dosyasını yükle

### 4. Yükleme Sonrası Dosya Yapısı
```
/var/www/siparis-takip/
├── backend/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── deploy.sh
├── deployment-guide.md
└── env-production-template.txt
```

---

## 🚀 Yükleme Sonrası (SSH ile)

### 1. SSH ile Bağlan
```bash
ssh user@your-server.com
```

### 2. Data Dizini Oluştur
```bash
mkdir -p /var/www/siparis-takip/data
```

### 3. Backend .env Oluştur
```bash
cd /var/www/siparis-takip/backend
nano .env
```

`env-production-template.txt` içeriğini kopyala ve yapıştır. Kaydet (Ctrl+X, Y, Enter).

### 4. Dosya İzinlerini Ayarla
```bash
cd /var/www/siparis-takip
chmod +x deploy.sh
chmod -R 755 backend/
chmod -R 755 frontend/
chmod -R 777 data/  # Database yazılabilir olmalı
```

### 5. Deploy Script'i Çalıştır
```bash
./deploy.sh
```

### 6. Servis Durumunu Kontrol Et
```bash
pm2 status
pm2 logs siparis-backend
```

### 7. Sunucu IP'sini Öğren
```bash
curl ifconfig.me
```

### 8. Tarayıcıda Test Et
```
http://YOUR_SERVER_IP
```

---

## 🔐 Trendyol IP Whitelist

1. Sunucu IP'nizi öğrenin: `curl ifconfig.me`
2. Trendyol Entegrasyon Paneline gidin
3. Ayarlar → API Ayarları → IP Whitelist
4. Sunucu IP'nizi ekleyin
5. Kaydedin

---

## 📝 İlk Sync Test

```bash
# SSH'de backend loglarını izleyin
pm2 logs siparis-backend

# Başka bir terminalde sync tetikleyin
curl http://localhost:3001/api/trendyol/sync

# Veya tarayıcıdan:
# http://YOUR_SERVER_IP/api/trendyol/sync
```

---

## 🔄 Güncelleme Yapmak

FTP'den yeni dosyaları yükledikten sonra:

```bash
ssh user@your-server.com
cd /var/www/siparis-takip
./deploy.sh
```

---

## ❓ Sorun Giderme

### Backend çalışmıyor
```bash
pm2 logs siparis-backend --lines 100
pm2 restart siparis-backend
```

### Port kullanımda hatası
```bash
# Port 3001'i kim kullanıyor?
sudo lsof -i :3001

# Kill et (PID'yi yukardaki komuttan al)
kill -9 PID
```

### Database yazma hatası
```bash
# Data klasörü izinlerini kontrol et
ls -la /var/www/siparis-takip/data
chmod -R 777 /var/www/siparis-takip/data
```

### Trendyol 401 Hatası
- IP whitelist'i kontrol edin
- `.env` dosyasındaki credentials'ları kontrol edin
- Trendyol panelinde API durumunu kontrol edin

