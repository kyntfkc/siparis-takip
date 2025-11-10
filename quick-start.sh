#!/bin/bash

# Sipariş Takip - Quick Start Script
# İlk kurulum için bu script'i çalıştırın

set -e  # Hata durumunda durdur

echo "🚀 Sipariş Takip - İlk Kurulum Başlıyor..."
echo ""

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Proje dizini
PROJECT_DIR="/var/www/siparis-takip"

# Root kontrolü
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Bu script'i root olarak çalıştırmayın!${NC}"
   echo "Normal kullanıcı ile çalıştırın, gerekirse sudo kullanılacak."
   exit 1
fi

echo "📦 1/10 - Sistem güncellemeleri kontrol ediliyor..."
sudo apt update

echo ""
echo "📦 2/10 - Node.js kurulumu kontrol ediliyor..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js bulunamadı, kuruluyor...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}✅ Node.js kuruldu${NC}"
else
    echo -e "${GREEN}✅ Node.js zaten kurulu: $(node --version)${NC}"
fi

echo ""
echo "📦 3/10 - PM2 kurulumu kontrol ediliyor..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 bulunamadı, kuruluyor...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}✅ PM2 kuruldu${NC}"
else
    echo -e "${GREEN}✅ PM2 zaten kurulu: $(pm2 --version)${NC}"
fi

echo ""
echo "📦 4/10 - Nginx kurulumu kontrol ediliyor..."
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx bulunamadı, kuruluyor...${NC}"
    sudo apt-get install -y nginx
    echo -e "${GREEN}✅ Nginx kuruldu${NC}"
else
    echo -e "${GREEN}✅ Nginx zaten kurulu: $(nginx -v 2>&1 | grep -o '[0-9.]*')${NC}"
fi

echo ""
echo "📁 5/10 - Proje dizini kontrol ediliyor..."
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Proje dizini bulunamadı: $PROJECT_DIR${NC}"
    echo "Lütfen önce FTP ile dosyaları yükleyin!"
    exit 1
fi
cd "$PROJECT_DIR"
echo -e "${GREEN}✅ Proje dizini bulundu${NC}"

echo ""
echo "📁 6/10 - Data ve logs dizinleri oluşturuluyor..."
mkdir -p "$PROJECT_DIR/data"
mkdir -p "$PROJECT_DIR/logs"
chmod -R 777 "$PROJECT_DIR/data"
chmod -R 777 "$PROJECT_DIR/logs"
echo -e "${GREEN}✅ Dizinler oluşturuldu${NC}"

echo ""
echo "🔐 7/10 - Backend .env dosyası kontrol ediliyor..."
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo -e "${YELLOW}⚠️  .env dosyası bulunamadı!${NC}"
    echo ""
    echo "Şimdi .env dosyasını oluşturacağız."
    echo "env-production-template.txt dosyasını açın ve değerleri girin."
    echo ""
    read -p "Devam etmek için Enter'a basın..."
    
    nano "$PROJECT_DIR/backend/.env"
    
    if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
        echo -e "${RED}❌ .env dosyası oluşturulmadı!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ .env dosyası oluşturuldu${NC}"
else
    echo -e "${GREEN}✅ .env dosyası mevcut${NC}"
fi

echo ""
echo "📦 8/10 - Backend build ediliyor..."
cd "$PROJECT_DIR/backend"
npm install
npm run build
echo -e "${GREEN}✅ Backend build tamamlandı${NC}"

echo ""
echo "🎨 9/10 - Frontend build ediliyor..."
cd "$PROJECT_DIR/frontend"
npm install
npm run build
echo -e "${GREEN}✅ Frontend build tamamlandı${NC}"

echo ""
echo "🚀 10/10 - PM2 ile backend başlatılıyor..."
cd "$PROJECT_DIR"
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✅ Backend başlatıldı${NC}"

echo ""
echo "⚙️  Nginx yapılandırması..."
echo ""
echo "Nginx config dosyasını kopyalayın:"
echo "  sudo cp nginx-config.conf /etc/nginx/sites-available/siparis-takip"
echo "  sudo ln -s /etc/nginx/sites-available/siparis-takip /etc/nginx/sites-enabled/"
echo ""
echo "Nginx config'i düzenleyin (server_name'i değiştirin):"
echo "  sudo nano /etc/nginx/sites-available/siparis-takip"
echo ""
echo "Nginx'i test edin ve restart edin:"
echo "  sudo nginx -t"
echo "  sudo systemctl restart nginx"
echo ""

# Sunucu IP'sini al
SERVER_IP=$(curl -s ifconfig.me || echo "BILINMIYOR")

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ KURULUM TAMAMLANDI!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo -e "${YELLOW}🌐 Sunucu IP'niz: ${SERVER_IP}${NC}"
echo ""
echo "📝 Sonraki Adımlar:"
echo "  1. Nginx config'i düzenleyin ve restart edin (yukarıdaki komutlar)"
echo "  2. Tarayıcıda test edin: http://${SERVER_IP}"
echo "  3. Trendyol IP Whitelist'e ekleyin: ${SERVER_IP}"
echo "  4. İlk sync'i tetikleyin: http://${SERVER_IP}/api/trendyol/sync"
echo ""
echo "📚 Logları görmek için:"
echo "  pm2 logs siparis-backend"
echo ""
echo "🔄 Güncelleme yapmak için:"
echo "  ./deploy.sh"
echo ""
echo -e "${GREEN}🎉 Başarılar!${NC}"

