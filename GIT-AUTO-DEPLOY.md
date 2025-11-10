# 🚀 Git Auto Pull Deployment Rehberi

Git + PM2 ile otomatik deployment kurulumu.

---

## ⚡ Hızlı Kurulum

### 1️⃣ Git Repository Oluşturun

**Yerel bilgisayarınızda:**

```bash
cd D:\cursor\siparis-takip
git init
git remote add origin YOUR_GITHUB_REPO_URL
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2️⃣ Sunucuda Git Repository Klonlayın

**SSH'da:**

```bash
cd /var/www
rm -rf siparis-takip
git clone YOUR_GITHUB_REPO_URL siparis-takip
cd siparis-takip
```

### 3️⃣ İlk Kurulum

```bash
bash setup-git-deploy.sh
```

Bu script:
- ✅ Git repository'yi kontrol eder
- ✅ Deploy script'ini hazırlar
- ✅ Cron job ekler (her 5 dakikada bir otomatik pull)

### 4️⃣ Manuel Deployment (İlk Sefer)

```bash
cd /var/www/siparis-takip
bash deploy.sh
```

---

## 🔄 Güncelleme Yapmak

### Yöntem 1: Otomatik (Cron Job)

Her 5 dakikada bir otomatik olarak:
- Git pull yapar
- Build eder
- PM2 restart eder

### Yöntem 2: Manuel (SSH)

```bash
ssh root@94.138.207.212
cd /var/www/siparis-takip
bash deploy.sh
```

### Yöntem 3: Webhook (Önerilen)

Backend'e webhook endpoint ekleyin (ileride).

---

## 📋 Deploy Script'i

`deploy.sh` script'i şunları yapar:

1. ✅ Git pull (yeni değişiklikleri çeker)
2. ✅ Backend npm install
3. ✅ Backend build
4. ✅ Frontend npm install
5. ✅ Frontend build
6. ✅ PM2 restart

---

## ⚙️ Cron Job Ayarları

Cron job'u değiştirmek için:

```bash
crontab -e
```

**Her 5 dakikada bir:**
```
*/5 * * * * cd /var/www/siparis-takip && git pull origin main >> /var/www/siparis-takip/logs/git-pull.log 2>&1 && bash deploy.sh >> /var/www/siparis-takip/logs/deploy.log 2>&1
```

**Her 1 saatte bir:**
```
0 * * * * cd /var/www/siparis-takip && git pull origin main >> /var/www/siparis-takip/logs/git-pull.log 2>&1 && bash deploy.sh >> /var/www/siparis-takip/logs/deploy.log 2>&1
```

**Sadece manuel:**
Cron job'u kaldırın:
```bash
crontab -r
```

---

## 🔍 Logları Kontrol Etme

```bash
# Git pull logları
tail -f /var/www/siparis-takip/logs/git-pull.log

# Deploy logları
tail -f /var/www/siparis-takip/logs/deploy.log

# PM2 logları
pm2 logs siparis-backend
```

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Kod Değişikliği Yaptınız

1. **Yerel bilgisayarınızda:**
   ```bash
   git add .
   git commit -m "Değişiklik açıklaması"
   git push origin main
   ```

2. **Sunucuda (otomatik veya manuel):**
   - Otomatik: 5 dakika içinde cron job çalışır
   - Manuel: `bash deploy.sh` çalıştırın

### Senaryo 2: Yeni Bağımlılık Eklendi

1. **Yerel:**
   ```bash
   npm install yeni-paket
   git add package.json package-lock.json
   git commit -m "Yeni paket eklendi"
   git push origin main
   ```

2. **Sunucuda:**
   - `deploy.sh` otomatik olarak `npm install` çalıştırır

---

## 🔐 Güvenlik

### .env Dosyası

`.env` dosyasını Git'e eklemeyin:

```bash
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
```

Sunucuda `.env` dosyasını manuel olarak oluşturun.

### .gitignore

```
node_modules/
dist/
.env
*.log
data/
logs/
```

---

## ✅ Avantajlar

- ✅ Tek komutla deployment (`git push`)
- ✅ Otomatik güncelleme (cron job)
- ✅ Versiyon kontrolü (Git)
- ✅ Kolay geri alma (`git revert`)
- ✅ Kod geçmişi

---

## 🆘 Sorun Giderme

### Git Pull Hatası

```bash
cd /var/www/siparis-takip
git status
git pull origin main
```

### Build Hatası

```bash
cd /var/www/siparis-takip/backend
npm install
npm run build
```

### PM2 Restart Hatası

```bash
pm2 restart siparis-backend
pm2 logs siparis-backend --err
```

---

**İyi çalışmalar!** 🚀

