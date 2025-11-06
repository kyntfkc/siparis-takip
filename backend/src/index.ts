import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { initDatabase } from './database/db.js';
import { setupRoutes } from './routes/index.js';
import { startTrendyolSync } from './services/trendyolSync.js';
import { startIkasSync } from './services/ikasSync.js';

// ES module için __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env dosyasını backend dizininden yükle (varsa)
const envPath = path.join(__dirname, '../.env');
console.log(`📁 .env dosyası yolu: ${envPath}`);
if (existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn('⚠️  .env dosyası yüklenemedi (Railway\'de environment variables kullanılıyor):', result.error.message);
  } else {
    console.log('✅ .env dosyası yüklendi');
  }
} else {
  console.log('ℹ️  .env dosyası bulunamadı (Railway\'de environment variables kullanılıyor)');
}

// Supabase credentials kontrolü
console.log(`🔑 SUPABASE_URL: ${process.env.SUPABASE_URL ? 'VAR (' + process.env.SUPABASE_URL.substring(0, 30) + '...)' : 'YOK'}`);
console.log(`🔑 SUPABASE_KEY: ${process.env.SUPABASE_KEY ? 'VAR (' + process.env.SUPABASE_KEY.substring(0, 30) + '...)' : 'YOK'}`);
console.log(`🔑 SUPABASE_STORAGE_BUCKET: ${process.env.SUPABASE_STORAGE_BUCKET || 'YOK'}`);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Railway'de PORT otomatik olarak atanır, $PORT kullanılmalı
console.log(`🌐 PORT: ${PORT}`);
console.log(`🌐 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

app.use(cors());
app.use(express.json());

// Static files - product images
app.use('/images', express.static(path.join(process.cwd(), 'public/product-images')));

// Database başlat
try {
  initDatabase();
} catch (error: any) {
  console.error('❌ Database başlatılamadı:', error.message);
  console.error(error.stack);
}

// Routes
try {
  setupRoutes(app);
} catch (error: any) {
  console.error('❌ Routes kurulamadı:', error.message);
  console.error(error.stack);
}

// Trendyol sync başlat
setTimeout(() => {
  try {
    startTrendyolSync();
  } catch (error: any) {
    console.error('❌ Trendyol sync başlatılamadı:', error.message);
    console.error(error.stack);
  }
}, 1000); // 1 saniye sonra başlat (server'ın tamamen hazır olması için)

// Ikas sync başlat (async olarak, hata olsa bile devam et)
setTimeout(() => {
  try {
    startIkasSync();
  } catch (error: any) {
    console.error('❌ Ikas sync başlatılamadı:', error.message);
    console.error(error.stack);
  }
}, 2000); // 2 saniye sonra başlat (Trendyol'dan sonra)

// Frontend static files (production) - routes'tan sonra
const frontendBuildPath = path.join(process.cwd(), '../frontend/dist');
if (process.env.NODE_ENV === 'production' && existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  // SPA için tüm route'ları index.html'e yönlendir (API route'ları hariç)
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/images')) {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Error handler middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Backend başarıyla başlatıldı`);
});
