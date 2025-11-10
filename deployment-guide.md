# FTP Sunucusuna Kurulum Rehberi

## 1. Sunucuda Gerekli Yazılımlar

```bash
# Node.js kurulumu (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu (process manager)
sudo npm install -g pm2

# Nginx kurulumu (opsiyonel ama önerilen)
sudo apt-get install -y nginx
```

## 2. Proje Dosyalarını FTP ile Yükle

FTP ile şu klasörleri yükleyin:
```
/backend
/frontend
package.json
```

**YÜKLEMEYIN:**
- node_modules
- .git
- database.json
- .env

## 3. Sunucuda Backend Kurulumu

```bash
# Backend dizinine git
cd /var/www/siparis-takip/backend

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
nano .env
```

**.env içeriği:**
```env
PORT=3001
NODE_ENV=production
DATABASE_PATH=/var/www/siparis-takip/data/database.json

# Trendyol API
TRENDYOL_SUPPLIER_ID=490931
TRENDYOL_API_KEY=8Zo4QEhUIxRELgH80Gip
TRENDYOL_API_SECRET=aWlScHJHRkFGcmdJWUtRT3d2c0NZSlRZ

# Supabase (opsiyonel - fotoğraflar için)
SUPABASE_URL=https://irqmqyoiwcfdxnvxrklr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycW1xeW9pd2NmZHhudnhya2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDIxMzk4OCwiZXhwIjoyMDQ1Nzg5OTg4fQ.4Yr6Ct91d6wIfY7TYIm0gk-lLPvkdCMKIVx2FoKx67o
```

```bash
# TypeScript'i build et
npm run build

# PM2 ile başlat
pm2 start dist/index.js --name siparis-backend

# PM2'yi sistem başlangıcına ekle
pm2 startup
pm2 save
```

## 4. Sunucuda Frontend Kurulumu

```bash
# Frontend dizinine git
cd /var/www/siparis-takip/frontend

# Bağımlılıkları yükle
npm install

# Production build
npm run build
```

## 5. Nginx Yapılandırması (Önerilen)

```bash
# Nginx config oluştur
sudo nano /etc/nginx/sites-available/siparis-takip
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;  # veya IP adresiniz

    # Frontend (static files)
    location / {
        root /var/www/siparis-takip/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Config'i aktif et
sudo ln -s /etc/nginx/sites-available/siparis-takip /etc/nginx/sites-enabled/

# Nginx'i test et ve restart et
sudo nginx -t
sudo systemctl restart nginx
```

## 6. Trendyol IP Whitelist

Sunucunuzun IP adresini öğrenin:
```bash
curl ifconfig.me
```

Bu IP'yi Trendyol Entegrasyon Paneli → API Ayarları → IP Whitelist'e ekleyin.

## 7. İlk Sync'i Başlat

```bash
# Backend loglarını izle
pm2 logs siparis-backend

# Tarayıcıdan Trendyol sync'i tetikle
curl http://your-domain.com/api/trendyol/sync
```

## 8. Otomatik Trendyol Sync (Cron Job)

```bash
# Crontab'ı düzenle
crontab -e
```

**Her 30 dakikada bir sync:**
```cron
*/30 * * * * curl http://localhost:3001/api/trendyol/sync
```

## 9. PM2 Komutları

```bash
# Logları göster
pm2 logs siparis-backend

# Servisi yeniden başlat
pm2 restart siparis-backend

# Servisi durdur
pm2 stop siparis-backend

# Durumu göster
pm2 status
```

## 10. Güncelleme Yapmak

```bash
# Backend'i durdur
pm2 stop siparis-backend

# Yeni dosyaları FTP ile yükle
# Backend dizininde:
npm run build
pm2 restart siparis-backend

# Frontend dizininde:
npm run build
# (Nginx otomatik olarak yeni build'i serve eder)
```

---

## Alternatif: PM2 ile Frontend'i de Serve Etme (Nginx olmadan)

Eğer Nginx kullanmak istemiyorsanız:

```bash
cd /var/www/siparis-takip/frontend
pm2 serve dist 80 --name siparis-frontend --spa
```

Bu durumda backend'in portunu `.env` dosyasında public olarak erişilebilir yapmanız gerekir.

