#!/bin/bash

# Sipariş Takip - FTP Deployment Script
# Bu script'i sunucuda çalıştırın

echo "🚀 Sipariş Takip Deployment Başlıyor..."

# Proje dizini
PROJECT_DIR="/var/www/siparis-takip"

# Backend build ve restart
echo "📦 Backend build ediliyor..."
cd $PROJECT_DIR/backend
npm install --production
npm run build

echo "🔄 Backend restart ediliyor..."
pm2 restart siparis-backend || pm2 start dist/index.js --name siparis-backend

# Frontend build
echo "🎨 Frontend build ediliyor..."
cd $PROJECT_DIR/frontend
npm install --production
npm run build

echo "✅ Deployment tamamlandı!"
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📝 Logları görmek için: pm2 logs siparis-backend"
echo "🌐 Sitenizi kontrol edin: http://$(curl -s ifconfig.me)"

