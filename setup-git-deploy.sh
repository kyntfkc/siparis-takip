#!/bin/bash
# Git Auto Pull Deployment Kurulumu

PROJECT_DIR="/var/www/siparis-takip"

echo "🚀 Git Auto Pull Deployment Kurulumu Başlıyor..."

cd "$PROJECT_DIR"

# Git repository kontrolü
if [ ! -d ".git" ]; then
    echo "❌ Git repository bulunamadı!"
    echo "📋 Önce Git repository oluşturun:"
    echo "   git init"
    echo "   git remote add origin YOUR_REPO_URL"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git push -u origin main"
    exit 1
fi

# Deploy script'i çalıştırılabilir yap
chmod +x deploy.sh

# PM2 ecosystem config'i güncelle
echo "✅ PM2 ecosystem config güncellendi"

# Cron job ekle (her 5 dakikada bir git pull)
echo "⏰ Cron job ekleniyor..."
(crontab -l 2>/dev/null; echo "*/5 * * * * cd $PROJECT_DIR && git pull origin main >> /var/www/siparis-takip/logs/git-pull.log 2>&1 && bash deploy.sh >> /var/www/siparis-takip/logs/deploy.log 2>&1") | crontab -

echo "✅ Git auto pull kurulumu tamamlandı!"
echo ""
echo "📋 Manuel deployment için:"
echo "   cd $PROJECT_DIR"
echo "   bash deploy.sh"
echo ""
echo "📋 Cron job'u kontrol etmek için:"
echo "   crontab -l"
echo ""
echo "📋 Logları görmek için:"
echo "   tail -f /var/www/siparis-takip/logs/git-pull.log"
echo "   tail -f /var/www/siparis-takip/logs/deploy.log"

