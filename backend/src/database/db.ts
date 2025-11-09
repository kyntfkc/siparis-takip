import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = new URL('.', import.meta.url).pathname.replace(/^\//, '').replace(/\\/g, '/');
const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'database.json');

// Railway Volume dizinini otomatik oluştur
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  try {
    mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Database dizini oluşturuldu: ${dbDir}`);
  } catch (err: any) {
    console.error(`❌ Database dizini oluşturulamadı: ${err.message}`);
  }
}

export interface Siparis {
  id?: number;
  trendyol_siparis_no: string;
  siparis_tarihi: string;
  musteri_adi: string;
  musteri_telefon?: string;
  musteri_adres?: string;
  urun_adi: string;
  urun_kodu?: string;
  urun_resmi?: string;
  miktar: number;
  fiyat: number;
  durum: 'Yeni' | 'Operasyon Onayı' | 'Üretimde' | 'Sertifika' | 'Yazdırıldı' | 'Tamamlandı' | 'İade/Hatalı';
  uretim_durumu?: 'Döküme Gönderilecek' | 'Dökümde' | 'Atölye' | 'Tamamlandı';
  not?: string;
  created_at?: string;
  updated_at?: string;
  trendyol_data?: string;
  ikas_data?: string;
  kisisellestirme?: string;
  platform?: 'Trendyol' | 'Ikas';
}

interface Database {
  siparisler: Siparis[];
  lastId: number;
}

let db: Database = {
  siparisler: [],
  lastId: 0,
};

function loadDatabase() {
  try {
    if (existsSync(dbPath)) {
      try {
        const data = readFileSync(dbPath, 'utf-8');
        if (!data || data.trim() === '') {
          console.warn('⚠️  Database dosyası boş, sıfırlanıyor');
          db = { siparisler: [], lastId: 0 };
          saveDatabase();
          return;
        }
        
        const parsed = JSON.parse(data);
        // Database yapısını kontrol et
        if (!parsed || typeof parsed !== 'object') {
          console.warn('⚠️  Database formatı geçersiz, sıfırlanıyor');
          db = { siparisler: [], lastId: 0 };
          saveDatabase();
          return;
        }
        
        if (!parsed.siparisler || !Array.isArray(parsed.siparisler)) {
          console.warn('⚠️  Database siparisler array değil, sıfırlanıyor');
          db = { siparisler: [], lastId: 0 };
          saveDatabase();
          return;
        }
        
        // Siparişleri temizle - null/undefined/gereksiz verileri filtrele
        const temizSiparisler = parsed.siparisler.filter((s: any) => {
          return s !== null && 
                 s !== undefined && 
                 typeof s === 'object' &&
                 s.trendyol_siparis_no &&
                 s.musteri_adi &&
                 s.urun_adi;
        });
        
        db = {
          siparisler: temizSiparisler,
          lastId: typeof parsed.lastId === 'number' ? parsed.lastId : (temizSiparisler.length > 0 ? Math.max(0, ...temizSiparisler.map((s: any) => s.id || 0)) : 0)
        };
        
        // Eğer temizlenmiş siparişler farklıysa kaydet
        if (temizSiparisler.length !== parsed.siparisler.length) {
          console.log(`⚠️  ${parsed.siparisler.length - temizSiparisler.length} geçersiz sipariş temizlendi`);
          saveDatabase();
        }
      } catch (parseError: any) {
        console.error('❌ Database parse hatası:', parseError.message);
        console.error('❌ Parse error code:', parseError.code);
        console.error('❌ Parse error stack:', parseError.stack);
        // Dosya meşgulse veya erişim hatası varsa, mevcut db'yi kullan (eğer varsa)
        if (parseError.code === 'EBUSY' || parseError.code === 'EACCES' || parseError.code === 'EAGAIN') {
          console.warn('⚠️  Dosya meşgul, mevcut database kullanılıyor');
          // db zaten yüklüyse, onu kullan
          if (db && db.siparisler && Array.isArray(db.siparisler)) {
            return;
          }
        }
        db = { siparisler: [], lastId: 0 };
        saveDatabase();
      }
    } else {
      // Dosya yoksa, varsayılan database oluştur
      db = { siparisler: [], lastId: 0 };
      saveDatabase();
    }
  } catch (error: any) {
    console.error('❌ Database yükleme hatası:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);
    // Dosya meşgulse veya erişim hatası varsa, mevcut db'yi kullan (eğer varsa)
    if (error.code === 'EBUSY' || error.code === 'EACCES' || error.code === 'EAGAIN') {
      console.warn('⚠️  Dosya meşgul, mevcut database kullanılıyor');
      if (db && db.siparisler && Array.isArray(db.siparisler)) {
        return;
      }
    }
    db = { siparisler: [], lastId: 0 };
    try {
      saveDatabase();
    } catch (saveError) {
      console.error('❌ Database kaydetme hatası:', saveError);
    }
  }
}

function saveDatabase() {
  try {
    // Dizin yoksa oluştur
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error: any) {
    // Dosya meşgulse veya erişim hatası varsa, sadece logla (kritik değil)
    if (error.code === 'EBUSY' || error.code === 'EACCES' || error.code === 'EAGAIN') {
      console.warn('⚠️  Database kaydedilemedi (dosya meşgul):', error.message);
      console.warn('⚠️  Değişiklikler bellek içinde tutuluyor, bir sonraki kayıt denemesi yapılacak');
    } else {
      console.error('❌ Database kaydedilemedi:', error.message);
      console.error('❌ Save error code:', error.code);
      console.error('❌ Save error stack:', error.stack);
    }
  }
}

export function initDatabase() {
  loadDatabase();
  console.log('✅ Database başlatıldı');
}

export function getAllSiparisler(durum?: string): Siparis[] {
  try {
    console.log('📂 getAllSiparisler çağrıldı, durum:', durum);
    console.log('📂 Database path:', dbPath || 'undefined');
    
    // Database'i yükle
    try {
      loadDatabase();
      console.log('📂 Database yüklendi, sipariş sayısı:', db?.siparisler?.length || 0);
    } catch (loadError: any) {
      console.error('❌ Database yükleme hatası:', loadError.message);
      console.error('❌ Load error stack:', loadError.stack);
      return [];
    }
    
    // Siparişleri güvenli bir şekilde al
    let siparisler: Siparis[] = [];
    try {
      if (db && db.siparisler && Array.isArray(db.siparisler)) {
        siparisler = db.siparisler.filter(s => {
          return s !== null && 
                 s !== undefined && 
                 typeof s === 'object' &&
                 Object.keys(s).length > 0;
        });
      }
    } catch (filterError: any) {
      console.error('❌ Sipariş filtreleme hatası:', filterError.message);
      return [];
    }
    
    console.log('📂 Filtrelemeden önce sipariş sayısı:', siparisler.length);
    
    // Durum filtresi
    if (durum && typeof durum === 'string') {
      try {
        const filtered = siparisler.filter(s => {
          try {
            if (!s || typeof s !== 'object') return false;
            if (!s.durum || typeof s.durum !== 'string') return false;
            return s.durum === durum;
          } catch (error) {
            console.error('❌ Tekil filtreleme hatası:', error);
            return false;
          }
        });
        siparisler = filtered;
        console.log('📂 Durum filtresinden sonra sipariş sayısı:', siparisler.length);
      } catch (durumFilterError: any) {
        console.error('❌ Durum filtreleme hatası:', durumFilterError.message);
        console.error('❌ Durum filter error stack:', durumFilterError.stack);
        return [];
      }
    }
    
    // Sıralama
    let sorted: Siparis[] = [];
    try {
      sorted = siparisler.sort((a, b) => {
        try {
          if (!a || !b) return 0;
          
          // Tarih alanlarını güvenli bir şekilde al
          const dateAStr = a.created_at || a.siparis_tarihi || '';
          const dateBStr = b.created_at || b.siparis_tarihi || '';
          
          if (!dateAStr || !dateBStr) return 0;
          
          const dateA = new Date(dateAStr).getTime();
          const dateB = new Date(dateBStr).getTime();
          
          if (isNaN(dateA) || isNaN(dateB)) return 0;
          
          return dateB - dateA;
        } catch (sortError) {
          console.error('❌ Sıralama hatası (sort callback):', sortError);
          return 0;
        }
      });
    } catch (sortError: any) {
      console.error('❌ Sıralama hatası:', sortError.message);
      console.error('❌ Sort error stack:', sortError.stack);
      // Sıralama başarısız olursa, sırasız döndür
      sorted = siparisler;
    }
    
    console.log('✅ getAllSiparisler başarılı, dönen sipariş sayısı:', sorted.length);
    if (sorted.length > 0) {
      console.log('📸 İlk sipariş fotoğrafı:', sorted[0]?.urun_resmi || 'undefined');
      console.log('📋 İlk sipariş keys:', Object.keys(sorted[0] || {}));
    }
    
    return sorted;
  } catch (error: any) {
    console.error('❌ getAllSiparisler genel hatası:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return [];
  }
}

export function getSiparisById(id: number): Siparis | undefined {
  loadDatabase();
  return db.siparisler.find(s => s.id === id);
}

export function createSiparis(siparis: Omit<Siparis, 'id' | 'created_at' | 'updated_at'>): Siparis {
  loadDatabase();
  
  // Trendyol CDN formatı doğrudan productCode ile çalışmıyor
  // Product API'sinden gerçek görsel URL'leri alınmalı
  // Şimdilik boş bırakıyoruz, placeholder gösterilecek
  
  db.lastId += 1;
  const now = new Date().toISOString();
  
  const yeniSiparis: Siparis = {
    ...siparis,
    id: db.lastId,
    created_at: now,
    updated_at: now,
  };
  
  // Eğer durum "Üretimde" ise ve üretim durumu yoksa, varsayılan olarak "Döküme Gönderilecek" ayarla
  if (yeniSiparis.durum === 'Üretimde' && !yeniSiparis.uretim_durumu) {
    (yeniSiparis as any).uretim_durumu = 'Döküme Gönderilecek';
  }
  
  db.siparisler.push(yeniSiparis);
  saveDatabase();
  
  return yeniSiparis;
}

export function updateSiparisDurum(id: number, durum: Siparis['durum']): Siparis | undefined {
  loadDatabase();
  
  const siparis = db.siparisler.find(s => s.id === id);
  if (!siparis) return undefined;
  
  siparis.durum = durum;
  siparis.updated_at = new Date().toISOString();
  
  // Eğer durum "Üretimde" ise ve üretim durumu yoksa, varsayılan olarak "Döküme Gönderilecek" ayarla
  if (durum === 'Üretimde' && !(siparis as any).uretim_durumu) {
    (siparis as any).uretim_durumu = 'Döküme Gönderilecek';
  }
  
  saveDatabase();
  
  return siparis;
}

// Sipariş üretim durumunu güncelle
export function updateSiparisUretimDurum(id: number, uretimDurum: 'Döküme Gönderilecek' | 'Dökümde' | 'Atölye' | 'Tamamlandı'): Siparis | undefined {
  loadDatabase();
  
  const siparis = db.siparisler.find(s => s.id === id);
  if (!siparis) return undefined;
  
  (siparis as any).uretim_durumu = uretimDurum;
  siparis.updated_at = new Date().toISOString();
  
  saveDatabase();
  
  return siparis;
}

// Sipariş notunu güncelle
export function updateSiparisNot(id: number, not: string): Siparis | undefined {
  loadDatabase();
  
  const siparis = db.siparisler.find(s => s.id === id);
  if (!siparis) return undefined;
  
  siparis.not = not || undefined;
  siparis.updated_at = new Date().toISOString();
  
  saveDatabase();
  
  return siparis;
}

export function deleteSiparis(id: number): void {
  loadDatabase();
  db.siparisler = db.siparisler.filter(s => s.id !== id);
  saveDatabase();
}

export function deleteAllSiparisler(): void {
  loadDatabase();
  db.siparisler = [];
  db.lastId = 0;
  saveDatabase();
  console.log('✅ Tüm siparişler silindi');
}

// 1 günden fazla olan siparişleri sil
export function deleteOldSiparisler(): number {
  try {
    loadDatabase();
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)); // 1 gün önce
    
    const initialCount = db.siparisler.length;
    
    // Sipariş tarihini kontrol et ve 1 günden fazla olanları sil
    db.siparisler = db.siparisler.filter(s => {
      if (!s || !s.siparis_tarihi) return true; // Tarihi olmayanları koru
      
      try {
        // Sipariş tarihini parse et
        let siparisTarihi: Date;
        
        if (typeof s.siparis_tarihi === 'string') {
          siparisTarihi = new Date(s.siparis_tarihi);
        } else if (typeof s.siparis_tarihi === 'number') {
          siparisTarihi = new Date(s.siparis_tarihi);
        } else {
          return true; // Geçersiz tarih formatı, koru
        }
        
        // Tarih geçerli mi kontrol et
        if (isNaN(siparisTarihi.getTime())) {
          return true; // Geçersiz tarih, koru
        }
        
        // 1 günden fazla olan siparişleri sil
        return siparisTarihi >= oneDayAgo;
      } catch (error) {
        console.error('❌ Sipariş tarihi parse hatası:', error);
        return true; // Hata durumunda koru
      }
    });
    
    const deletedCount = initialCount - db.siparisler.length;
    
    if (deletedCount > 0) {
      saveDatabase();
      console.log(`✅ ${deletedCount} eski sipariş silindi (1 günden fazla)`);
    } else {
      console.log('ℹ️  Silinecek eski sipariş bulunamadı');
    }
    
    return deletedCount;
  } catch (error: any) {
    console.error('❌ Eski sipariş silme hatası:', error.message);
    console.error('❌ Error stack:', error.stack);
    return 0;
  }
}

// Mevcut siparişlerin fotoğraflarını güncelle
export function updateSiparisFotoğraf(): void {
  loadDatabase();
  let guncellenen = 0;
  
  // Trendyol CDN formatı doğrudan productCode ile çalışmıyor
  // Product API'sinden gerçek görsel URL'leri alınmalı
  // Şimdilik fotoğrafları temizle, placeholder gösterilsin
  db.siparisler.forEach(siparis => {
    // Yanlış format URL'leri temizle
    if (siparis.urun_resmi && siparis.urun_resmi.includes('cdn.dsmcdn.com/mnresize/200/200/product/')) {
      siparis.urun_resmi = undefined;
      siparis.updated_at = new Date().toISOString();
      guncellenen++;
    }
  });
  
  if (guncellenen > 0) {
    saveDatabase();
    console.log(`✅ ${guncellenen} siparişe fotoğraf URL'si eklendi`);
  }
}

// Belirli bir siparişin fotoğrafını güncelle
export function updateSiparisFotoğrafById(id: number, imageUrl: string): void {
  loadDatabase();
  
  const siparis = db.siparisler.find(s => s.id === id);
  if (!siparis) {
    console.warn(`⚠️  Sipariş bulunamadı: ${id}`);
    return;
  }
  
  siparis.urun_resmi = imageUrl;
  siparis.updated_at = new Date().toISOString();
  saveDatabase();
  
  console.log(`✅ Sipariş ${id} fotoğrafı güncellendi: ${imageUrl.substring(0, 80)}`);
}

export function getRaporlar(baslangic?: string, bitis?: string): any[] {
  try {
    console.log('📊 getRaporlar çağrıldı, baslangic:', baslangic, 'bitis:', bitis);
    
    // Database'i yükle
    try {
      loadDatabase();
      console.log('📊 Database yüklendi, sipariş sayısı:', db?.siparisler?.length || 0);
    } catch (loadError: any) {
      console.error('❌ Database yükleme hatası (getRaporlar):', loadError.message);
      return [];
    }
    
    // Siparişleri güvenli bir şekilde al
    let siparisler: any[] = [];
    try {
      if (db && db.siparisler && Array.isArray(db.siparisler)) {
        siparisler = db.siparisler.filter(s => {
          return s !== null && 
                 s !== undefined && 
                 typeof s === 'object' &&
                 Object.keys(s).length > 0;
        });
      }
    } catch (filterError: any) {
      console.error('❌ Sipariş filtreleme hatası (getRaporlar):', filterError.message);
      return [];
    }
    
    // Tarih filtresi
    try {
      if (baslangic) {
        siparisler = siparisler.filter(s => {
          if (!s || !s.siparis_tarihi) return false;
          try {
            return new Date(s.siparis_tarihi) >= new Date(baslangic);
          } catch {
            return false;
          }
        });
      }
      
      if (bitis) {
        const bitisTarihi = new Date(bitis);
        bitisTarihi.setHours(23, 59, 59, 999);
        siparisler = siparisler.filter(s => {
          if (!s || !s.siparis_tarihi) return false;
          try {
            return new Date(s.siparis_tarihi) <= bitisTarihi;
          } catch {
            return false;
          }
        });
      }
    } catch (dateFilterError: any) {
      console.error('❌ Tarih filtreleme hatası:', dateFilterError.message);
    }
    
    // Tüm olası durumları başlangıçta 0 olarak ekle
    const tumDurumlar = ['Yeni', 'Operasyon Onayı', 'Üretimde', 'Sertifika', 'Yazdırıldı', 'Tamamlandı', 'İade/Hatalı'];
    const raporlar: Record<string, any> = {};
    
    tumDurumlar.forEach(durum => {
      raporlar[durum] = {
        durum,
        sayi: 0,
        toplam_miktar: 0,
        toplam_fiyat: 0,
      };
    });
    
    // Raporları hesapla
    try {
      siparisler.forEach(siparis => {
        try {
          if (siparis && siparis.durum && typeof siparis.durum === 'string' && raporlar[siparis.durum]) {
            raporlar[siparis.durum].sayi += 1;
            raporlar[siparis.durum].toplam_miktar += (typeof siparis.miktar === 'number' ? siparis.miktar : 0);
            const miktar = typeof siparis.miktar === 'number' && siparis.miktar > 0 ? siparis.miktar : 1;
            const fiyat = typeof siparis.fiyat === 'number' ? siparis.fiyat : 0;
            raporlar[siparis.durum].toplam_fiyat += (fiyat * miktar);
          }
        } catch (siparisError) {
          console.error('❌ Sipariş işleme hatası (getRaporlar):', siparisError);
        }
      });
    } catch (forEachError: any) {
      console.error('❌ Rapor hesaplama hatası:', forEachError.message);
    }
    
    console.log('✅ getRaporlar başarılı, rapor sayısı:', Object.values(raporlar).length);
    return Object.values(raporlar);
  } catch (error: any) {
    console.error('❌ getRaporlar genel hatası:', error.message);
    console.error('❌ Error stack:', error.stack);
    return [];
  }
}