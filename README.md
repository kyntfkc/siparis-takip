# Sipariş Takip Sistemi

Trendyol siparişlerini otomatik çekip takip eden sistem.

## Özellikler

- 🔄 Trendyol API entegrasyonu (30 dakikada bir otomatik senkronizasyon)
- 📋 Operasyon Paneli (Yeni siparişleri üretime gönderme)
- 🔧 Atölye Paneli (Üretimdeki siparişleri yönetme)
- 📊 Sipariş Takip ve Raporlama (Filtreleme, renkli görünüm)

## Kurulum

### 1. Tüm bağımlılıkları yükle

```bash
npm run install:all
```

### 2. Backend ayarları

`backend/.env` dosyası oluştur:

```env
PORT=3001
TRENDYOL_API_URL=https://api.trendyol.com
TRENDYOL_SUPPLIER_ID=your_supplier_id
TRENDYOL_API_KEY=your_api_key
TRENDYOL_API_SECRET=your_api_secret
DATABASE_PATH=./database.sqlite
```

### 3. Çalıştırma

```bash
npm run dev
```

Backend: http://localhost:3001  
Frontend: http://localhost:3000

## Kullanım

1. **Operasyon Paneli**: Yeni siparişleri görüntüleyip "Üretime Gönder" ile üretime yönlendirin.
2. **Atölye Paneli**: Üretimdeki siparişleri görüntüleyip "Tamamlandı" veya "İade/Hatalı" olarak işaretleyin.
3. **Takip & Raporlar**: Tüm siparişleri filtreleyip raporları görüntüleyin.

## Teknolojiler

- **Backend**: Node.js, Express, TypeScript, SQLite
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **API**: Trendyol REST API
