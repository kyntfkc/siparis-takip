#!/bin/bash
# Git Auto Pull Deployment Script
# PM2 tarafından otomatik çalıştırılır

set -e

PROJECT_DIR="/var/www/siparis-takip"

echo "🔄 Git pull başlıyor..."
cd "$PROJECT_DIR"

# Git pull
git pull origin main || git pull origin master

echo "📦 Backend build ediliyor..."
cd backend
npm install
npm run build

echo "🎨 Frontend build ediliyor..."
cd ../frontend
npm install
npm run build

echo "🚀 PM2 restart ediliyor..."
cd "$PROJECT_DIR"
pm2 restart siparis-backend

echo "✅ Deployment tamamlandı!"
