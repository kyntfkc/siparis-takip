import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { initDatabase } from './database/db.js';
import { initUsersDatabase } from './database/users.js';
import { setupRoutes } from './routes/index.js';
import { startTrendyolSync } from './services/trendyolSync.js';
import { startIkasSync } from './services/ikasSync.js';

// ES module için __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Unhandled promise rejection ve exception handling
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Crash'i önlemek için hata loglanıyor ama process devam ediyor
  if (reason instanceof Error) {
    console.error('❌ Error Stack:', reason.stack);
  }
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Error Stack:', error.stack);
  // Process'i kapatma, sadece logla (Railway otomatik restart eder)
  // Crash'i önlemek için process devam ediyor
});

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
// Railway'de PORT otomatik atanır ve zorunludur
// Development'ta 3001, production'da Railway'in verdiği PORT
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

if (!process.env.PORT && process.env.NODE_ENV === 'production') {
  console.error('⚠️ Railway\'de PORT environment variable tanımlı olmalı!');
}

console.log(`🌐 PORT: ${PORT} (Railway Auto: ${!!process.env.PORT})`);
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

// Users database başlat
try {
  initUsersDatabase();
} catch (error: any) {
  console.error('❌ Users database başlatılamadı:', error.message);
  console.error(error.stack);
}

// Frontend static files (production) - routes'tan ÖNCE ekle
// Railway'de build sonrası dosyalar root dizinde olabilir veya backend dizininde
let frontendBuildPath: string | null = null;
const possiblePaths = [
  path.join(process.cwd(), '../frontend/dist'), // Backend dizininden root'a çık
  path.join(process.cwd(), 'frontend/dist'),     // Root dizininden
  path.join(__dirname, '../../frontend/dist'),  // Backend/src'den root'a çık
];

for (const possiblePath of possiblePaths) {
  if (existsSync(possiblePath)) {
    frontendBuildPath = possiblePath;
    console.log(`✅ Frontend build path bulundu: ${frontendBuildPath}`);
    break;
  }
}

if (process.env.NODE_ENV === 'production' && frontendBuildPath) {
  app.use(express.static(frontendBuildPath, { index: false })); // index: false çünkü SPA fallback kullanacağız
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

// SPA fallback route - routes'tan SONRA, en sonda
if (process.env.NODE_ENV === 'production' && frontendBuildPath) {
  app.get('*', (req, res, next) => {
    // API route'ları ve static dosyaları hariç tut
    if (req.path.startsWith('/api') || req.path.startsWith('/images')) {
      return next();
    }
    // Frontend dosyaları için index.html gönder
    res.sendFile(path.join(frontendBuildPath!, 'index.html'), (err) => {
      if (err) {
        console.error('❌ Frontend index.html gönderilemedi:', err);
        res.status(404).json({ error: 'Frontend dosyası bulunamadı' });
      }
    });
  });
} else if (process.env.NODE_ENV === 'production') {
  console.log(`⚠️  Frontend build path bulunamadı. Denenen path'ler:`, possiblePaths);
}

// Error handler middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`✅ Backend başarıyla başlatıldı`);
  });
} catch (error: any) {
  console.error('❌ Server başlatılamadı:', error.message);
  console.error('❌ Error Stack:', error.stack);
  process.exit(1);
}
