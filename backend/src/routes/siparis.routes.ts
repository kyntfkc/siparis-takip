import { Router } from 'express';
import {
  getAllSiparisler,
  getSiparisById,
  updateSiparisDurum,
  updateSiparisUretimDurum,
  updateSiparisNot,
  deleteSiparis,
  createSiparis,
  updateSiparisFotoğraf,
  updateSiparisFotoğrafById,
  deleteOldSiparisler,
  deleteAllSiparisler,
} from '../database/db.js';

const router = Router();

// Middleware: Her istek için log
router.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Query:`, req.query);
  next();
});

// Tüm siparişleri getir (durum filtresi ile)
router.get('/', (req, res) => {
  try {
    const { durum } = req.query;
    console.log('📥 GET /api/siparisler çağrıldı, durum:', durum);
    
    let siparisler: any[] = [];
    try {
      siparisler = getAllSiparisler(durum as string | undefined);
      console.log('✅ getAllSiparisler başarılı, sipariş sayısı:', siparisler?.length || 0);
      
      // Siparişlerin geçerli olduğundan emin ol
      if (!Array.isArray(siparisler)) {
        console.warn('⚠️  getAllSiparisler array döndürmedi, tip:', typeof siparisler);
        siparisler = [];
      }
    } catch (getAllError: any) {
      console.error('❌ getAllSiparisler hatası:', getAllError.message);
      console.error('❌ getAllSiparisler stack:', getAllError.stack);
      siparisler = [];
    }
    
    // Response'u güvenli bir şekilde gönder
    if (!Array.isArray(siparisler)) {
      console.warn('⚠️  Siparişler array değil, boş array gönderiliyor');
      siparisler = [];
    }
    
    console.log('📊 Serialize işlemi başlıyor, sipariş sayısı:', siparisler.length);
    
    // Siparişleri optimize edilmiş şekilde serialize et (performans için)
    let safeSiparisler: any[] = [];
    try {
      safeSiparisler = siparisler
        .filter((s: any) => {
          if (s === null || s === undefined) return false;
          if (typeof s !== 'object') return false;
          return true;
        })
        .map((s: any, index: number) => {
          try {
            // Circular reference'ları önlemek için sadece gerekli alanları al
            const serialized = {
              id: s?.id ?? null,
              trendyol_siparis_no: s?.trendyol_siparis_no ?? '',
              siparis_tarihi: s?.siparis_tarihi ?? '',
              musteri_adi: s?.musteri_adi ?? '',
              musteri_telefon: s?.musteri_telefon ?? null,
              musteri_adres: s?.musteri_adres ?? null,
              urun_adi: s?.urun_adi ?? '',
              urun_kodu: s?.urun_kodu ?? null,
              urun_resmi: s?.urun_resmi ?? null,
              miktar: s?.miktar ?? 0,
              fiyat: s?.fiyat ?? 0,
              durum: s?.durum ?? 'Yeni',
              uretim_durumu: s?.uretim_durumu ?? null,
              not: s?.not ?? null,
              platform: s?.platform ?? null,
              created_at: s?.created_at ?? null,
              updated_at: s?.updated_at ?? null,
            };
            return serialized;
          } catch (e: any) {
            console.error(`❌ Sipariş serialize hatası (index ${index}):`, e?.message);
            return null;
          }
        })
        .filter((s: any) => s !== null);
      
      console.log('✅ Serialize işlemi tamamlandı, güvenli sipariş sayısı:', safeSiparisler.length);
    } catch (serializeError: any) {
      console.error('❌ Serialize hatası:', serializeError.message);
      console.error('❌ Serialize stack:', serializeError.stack);
      safeSiparisler = [];
    }
    
    console.log('📤 Response gönderiliyor, sipariş sayısı:', safeSiparisler.length);
    res.json(safeSiparisler);
  } catch (error: any) {
    console.error('❌ Route handler hatası:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error name:', error?.name);
    res.status(500).json({ 
      error: error?.message || 'Siparişler getirilemedi',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// Tek sipariş getir
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const siparis = getSiparisById(id);
    
    if (!siparis) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }
    
    res.json(siparis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sipariş durumu güncelle
router.patch('/:id/durum', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { durum } = req.body;

    const gecerliDurumlar = ['Yeni', 'Operasyon Onayı', 'Üretimde', 'Sertifika', 'Yazdırıldı', 'Tamamlandı', 'İade/Hatalı'];
    if (!gecerliDurumlar.includes(durum)) {
      return res.status(400).json({ error: 'Geçersiz durum' });
    }

    const siparis = updateSiparisDurum(id, durum);
    
    if (!siparis) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    res.json(siparis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sipariş üretim durumunu güncelle
router.patch('/:id/uretim-durum', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { uretimDurum } = req.body;

    const gecerliUretimDurumlari = ['Döküme Gönderilecek', 'Dökümde', 'Atölye', 'Tamamlandı'];
    if (!gecerliUretimDurumlari.includes(uretimDurum)) {
      return res.status(400).json({ error: 'Geçersiz üretim durumu' });
    }

    const siparis = updateSiparisUretimDurum(id, uretimDurum);
    
    if (!siparis) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    res.json(siparis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sipariş notunu güncelle
router.patch('/:id/not', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { not } = req.body;

    if (typeof not !== 'string' && not !== null && not !== undefined) {
      return res.status(400).json({ error: 'Not string olmalı' });
    }

    const siparis = updateSiparisNot(id, not || '');
    
    if (!siparis) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    res.json(siparis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manuel sipariş oluştur (test için)
router.post('/', (req, res) => {
  try {
    const siparis = createSiparis(req.body);
    res.status(201).json(siparis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sipariş sil
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    deleteSiparis(id);
    res.json({ message: 'Sipariş silindi' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mevcut siparişlerin fotoğraflarını güncelle (Supabase'den)
router.post('/update-fotograflar', async (req, res) => {
  try {
    const { fetchProductImage, clearProductImageCache } = await import('../services/trendyolSync.js');
    // Cache'i temizle ki yeni kod çalışsın (klasörlerde arama yapsın)
    clearProductImageCache();
    const allSiparisler = getAllSiparisler();
    
    let guncellenen = 0;
    let hatali = 0;
    
    // Tüm siparişlerin fotoğraflarını güncelle (ürün kodu olan tüm siparişler)
    const siparislerToUpdate = allSiparisler
      .filter(s => s.urun_kodu)
      .slice(0, 100);
    
    console.log(`📸 ${siparislerToUpdate.length} sipariş için fotoğraf güncelleniyor (Supabase, klasörler dahil)...`);
    
    // Batch olarak çek (parallel)
    const updatePromises = siparislerToUpdate.map(async (siparis) => {
      try {
        if (siparis.urun_kodu && siparis.id) {
          const imageUrl = await fetchProductImage(siparis.urun_kodu, siparis.urun_adi);
          if (imageUrl) {
            updateSiparisFotoğrafById(siparis.id, imageUrl);
            return { success: true, id: siparis.id };
          } else {
            return { success: false, id: siparis.id };
          }
        }
        return { success: false, id: siparis.id };
      } catch (error: any) {
        console.error(`❌ Sipariş ${siparis.id} fotoğrafı güncellenemedi:`, error.message);
        return { success: false, id: siparis.id };
      }
    });
    
    const results = await Promise.all(updatePromises);
    guncellenen = results.filter(r => r.success).length;
    hatali = results.filter(r => !r.success).length;
    
    console.log(`✅ Fotoğraf güncelleme tamamlandı: ${guncellenen} başarılı, ${hatali} hatalı`);
    
    res.json({ 
      message: 'Fotoğraf güncelleme tamamlandı',
      guncellenen,
      hatali,
      toplam: siparislerToUpdate.length
    });
  } catch (error: any) {
    console.error('❌ Fotoğraf güncelleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eski siparişleri temizle (1 günden fazla olanlar)
router.delete('/cleanup/old', (req, res) => {
  try {
    const deletedCount = deleteOldSiparisler();
    res.json({ 
      message: 'Eski siparişler temizlendi',
      deletedCount,
      success: true
    });
  } catch (error: any) {
    console.error('❌ Eski sipariş temizleme hatası:', error);
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

// Tüm siparişleri sil
router.delete('/cleanup/all', (req, res) => {
  try {
    deleteAllSiparisler();
    res.json({ 
      message: 'Tüm siparişler silindi',
      success: true
    });
  } catch (error: any) {
    console.error('❌ Tüm sipariş silme hatası:', error);
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

export default router;
