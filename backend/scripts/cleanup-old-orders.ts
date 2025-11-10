import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'database.json');

interface Siparis {
  id?: number;
  trendyol_siparis_no: string;
  siparis_tarihi: string;
  musteri_adi: string;
  [key: string]: any;
}

interface Database {
  siparisler: Siparis[];
  lastId: number;
}

function cleanupOldOrders(daysToKeep: number = 30) {
  try {
    console.log(`🧹 Eski siparişleri temizliyorum (son ${daysToKeep} gün korunacak)...`);
    
    if (!existsSync(dbPath)) {
      console.log('⚠️  Database dosyası bulunamadı');
      return;
    }

    // Database dosyasını oku
    const data = readFileSync(dbPath, 'utf-8');
    const db: Database = JSON.parse(data);

    if (!db.siparisler || !Array.isArray(db.siparisler)) {
      console.log('⚠️  Database formatı geçersiz');
      return;
    }

    const totalOrders = db.siparisler.length;
    console.log(`📊 Toplam sipariş sayısı: ${totalOrders}`);

    // Tarih hesaplama
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    console.log(`📅 Kesme tarihi: ${cutoffDate.toISOString().split('T')[0]}`);

    // Eski siparişleri filtrele
    const filteredOrders = db.siparisler.filter((siparis) => {
      if (!siparis.siparis_tarihi) {
        // Tarih yoksa, created_at kullan
        if (siparis.created_at) {
          const orderDate = new Date(siparis.created_at);
          return orderDate >= cutoffDate;
        }
        // Hiç tarih yoksa, koru (güvenli tarafta kal)
        return true;
      }

      const orderDate = new Date(siparis.siparis_tarihi);
      return orderDate >= cutoffDate;
    });

    const deletedCount = totalOrders - filteredOrders.length;
    console.log(`🗑️  Silinen sipariş sayısı: ${deletedCount}`);
    console.log(`✅ Kalan sipariş sayısı: ${filteredOrders.length}`);

    // Yeni database oluştur
    const newDb: Database = {
      siparisler: filteredOrders,
      lastId: db.lastId || 0
    };

    // Database dosyasını kaydet
    writeFileSync(dbPath, JSON.stringify(newDb, null, 2), 'utf-8');
    
    console.log(`✅ Eski siparişler temizlendi! ${deletedCount} sipariş silindi.`);
    
    // Dosya boyutunu göster
    const stats = statSync(dbPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📦 Database dosya boyutu: ${fileSizeMB} MB`);

  } catch (error: any) {
    console.error('❌ Temizleme hatası:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

// Komut satırından gün sayısını al (varsayılan: 30 gün)
const daysToKeep = process.argv[2] ? parseInt(process.argv[2]) : 30;
cleanupOldOrders(daysToKeep);

