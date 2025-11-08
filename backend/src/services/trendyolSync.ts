import cron from 'node-cron';
import axios from 'axios';
import { createSiparis, getAllSiparisler, deleteAllSiparisler } from '../database/db.js';
import { getProductImageFromSupabase } from './supabaseStorage.js';

// Ürün fotoğraf cache'i (rate limit'i azaltmak için)
const productImageCache = new Map<string, string | null>();
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 24 saat
const MAX_CONCURRENT_PRODUCT_REQUESTS = 3; // Aynı anda maksimum 3 ürün isteği
const REQUEST_DELAY = 400; // Her istek arasında 400ms bekle (rate limit için)

// Cache'den ürün fotoğrafı al
function getCachedProductImage(productCode: string): string | null | undefined {
  const cached = productImageCache.get(productCode);
  if (cached !== undefined) {
    return cached;
  }
  return undefined;
}

// Cache'e ürün fotoğrafı kaydet
function setCachedProductImage(productCode: string, imageUrl: string | null): void {
  productImageCache.set(productCode, imageUrl);
}

// Cache'i temizle
export function clearProductImageCache(): void {
  productImageCache.clear();
  console.log('🗑️  Ürün fotoğraf cache\'i temizlendi');
}

// Ürün fotoğrafını Supabase Storage'dan çek (cache ile)
export async function fetchProductImage(productCode: string | number, productName?: string, forceRefresh: boolean = false): Promise<string | null> {
  try {
    const productCodeStr = productCode.toString();
    console.log(`📸 fetchProductImage çağrıldı: ${productCodeStr} (${productName || 'ürün adı yok'})`);
    
    // 1. Cache kontrolü (sadece valid URL varsa cache'den döndür, null değerleri ignore et)
    if (!forceRefresh) {
      const cached = getCachedProductImage(productCodeStr);
      if (cached !== undefined && cached !== null) {
        console.log(`📸 Cache'den bulundu: ${productCodeStr} -> ${cached}`);
        return cached;
      }
      // null değer varsa cache'den sil ve tekrar Supabase'ye git
      if (cached === null) {
        productImageCache.delete(productCodeStr);
        console.log(`📸 Cache'de null değer var, tekrar Supabase'ye gidiliyor: ${productCodeStr}`);
      }
    }

    console.log(`📸 Cache'de yok, Supabase'den çekiliyor: ${productCodeStr}`);
    // 2. Supabase Storage'dan fotoğrafı al (ürün adı da geçiliyor)
    const imageUrl = await getProductImageFromSupabase(productCodeStr, productName);
    
    console.log(`📸 Supabase'den dönen sonuç: ${productCodeStr} -> ${imageUrl || 'null'}`);
    // Cache'e kaydet (sadece valid URL varsa kaydet)
    if (imageUrl) {
      setCachedProductImage(productCodeStr, imageUrl);
    }
    
    return imageUrl;
  } catch (error: any) {
    console.error(`❌ Fotoğraf alma hatası (${productCode}):`, error.message);
    console.error(`❌ Error stack:`, error.stack);
    return null;
  }
}

// Batch olarak ürün fotoğraflarını çek (rate limit için)
// Sadece ilk 1-2 resmi getir (performans için)
async function fetchProductImagesBatch(productCodes: (string | number)[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const batchSize = MAX_CONCURRENT_PRODUCT_REQUESTS;
  
  for (let i = 0; i < productCodes.length; i += batchSize) {
    const batch = productCodes.slice(i, i + batchSize);
    
    // Her batch arasında delay (rate limit için)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
    
    const batchPromises = batch.map(async (productCode, index) => {
      // Batch içindeki her istek arasında kısa delay
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
      }
      const imageUrl = await fetchProductImage(productCode);
      return { productCode: productCode.toString(), imageUrl };
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ productCode, imageUrl }) => {
      results.set(productCode, imageUrl);
    });
  }
  
  return results;
}

// Trendyol API entegrasyonu
// Not: Gerçek API endpoint'leri ve authentication Trendyol dokümantasyonuna göre ayarlanmalı

interface TrendyolSiparis {
  orderNumber?: string;
  orderId?: number;
  orderDate?: string;
  orderDateFormatted?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerId?: number;
  customerPhoneNumber?: string;
  shippingAddress?: {
    address1?: string;
    address2?: string;
    city?: string;
    district?: string;
    country?: string;
    postalCode?: string;
  };
  lines?: Array<{
    productName?: string;
    productCode?: string;
    barcode?: string;
    quantity?: number;
    price?: number;
    salePrice?: number;
    currencyCode?: string;
    productImageUrl?: string;
    productImage?: string;
  }>;
  packageHistories?: any[];
  [key: string]: any; // Trendyol API'nin diğer alanları için
}

export async function fetchTrendyolSiparisler(): Promise<TrendyolSiparis[]> {
  try {
    const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
    const apiKey = process.env.TRENDYOL_API_KEY;
    const apiSecret = process.env.TRENDYOL_API_SECRET;
    const apiUrl = process.env.TRENDYOL_API_URL;

    if (!supplierId || !apiKey || !apiSecret) {
      console.log('⚠️  Trendyol API credentials eksik. Lütfen .env dosyasını kontrol edin.');
      return [];
    }

    // Son 7 günlük siparişler
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Trendyol API timestamp formatı (epoch milliseconds)
    const startDateTimestamp = startDate.getTime();
    const endDateTimestamp = endDate.getTime();

    console.log(`📅 Siparişler çekiliyor: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // Trendyol API endpoint
    const url = `${apiUrl}/${supplierId}/orders`;
    
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    console.log(`🔗 API URL: ${url}`);
    console.log(`📋 Parametreler:`, { startDate: startDateTimestamp, endDate: endDateTimestamp, page: 0, size: 200 });

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      params: {
        startDate: startDateTimestamp,
        endDate: endDateTimestamp,
        page: 0,
        size: 200, // Maksimum sayfa boyutu
      },
    });

    console.log(`📥 API Response Status: ${response.status}`);
    console.log(`📥 API Response Data Type:`, typeof response.data);
    console.log(`📥 API Response Keys:`, Object.keys(response.data || {}));
    
    // Trendyol API response formatı: { content: [...] } veya direkt array
    let siparisler: any[] = [];
    
    if (Array.isArray(response.data)) {
      siparisler = response.data;
    } else if (response.data?.content && Array.isArray(response.data.content)) {
      siparisler = response.data.content;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      siparisler = response.data.data;
    } else if (response.data?.orders && Array.isArray(response.data.orders)) {
      siparisler = response.data.orders;
    } else {
      console.log('⚠️  Beklenmeyen response formatı:', JSON.stringify(response.data).substring(0, 500));
    }
    
    console.log(`📦 ${siparisler.length} sipariş bulundu`);
    
    if (siparisler.length > 0) {
      console.log(`📝 İlk sipariş örneği (tam):`, JSON.stringify(siparisler[0], null, 2));
      // Lines içindeki fotoğraf ve model kod alanlarını kontrol et
      if (siparisler[0].lines && siparisler[0].lines.length > 0) {
        console.log(`📸 İlk satır örneği (tam):`, JSON.stringify(siparisler[0].lines[0], null, 2));
        // Fotoğraf alanlarını tek tek kontrol et
        const firstLine = siparisler[0].lines[0];
        console.log(`📸 Fotoğraf alanları:`);
        console.log(`  - productImageUrl: ${firstLine.productImageUrl}`);
        console.log(`  - productImage: ${firstLine.productImage}`);
        console.log(`  - imageUrl: ${(firstLine as any).imageUrl}`);
        console.log(`  - image: ${(firstLine as any).image}`);
        console.log(`  - product: ${JSON.stringify((firstLine as any).product)}`);
        // Model kod alanlarını kontrol et
        console.log(`🔢 Model Kod Alanları:`);
        console.log(`  - productCode: ${firstLine.productCode}`);
        console.log(`  - barcode: ${firstLine.barcode}`);
        console.log(`  - sku: ${(firstLine as any).sku}`);
        console.log(`  - modelCode: ${(firstLine as any).modelCode}`);
        console.log(`  - product.code: ${(firstLine as any).product?.code}`);
        console.log(`  - product.barcode: ${(firstLine as any).product?.barcode}`);
        console.log(`  - product.sku: ${(firstLine as any).product?.sku}`);
        console.log(`  - product.modelCode: ${(firstLine as any).product?.modelCode}`);
      }
    }
    
    return siparisler;
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Trendyol API hatası:', error.response.status);
      console.error('❌ Response Data:', JSON.stringify(error.response.data).substring(0, 500));
      console.error('❌ Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('❌ Request yapılamadı:', error.message);
      console.error('❌ Request URL:', error.config?.url);
    } else {
      console.error('❌ Trendyol API hatası:', error.message);
      console.error('❌ Error Stack:', error.stack);
    }
    return [];
  }
}

async function syncTrendyolSiparisler() {
  try {
    console.log('🔄 Trendyol siparişleri senkronize ediliyor...');
    
    const trendyolSiparisler = await fetchTrendyolSiparisler();
    let mevcutSiparisler: any[] = [];
    try {
      mevcutSiparisler = getAllSiparisler();
    } catch (getAllError: any) {
      console.error('❌ Mevcut siparişler alınamadı:', getAllError.message);
      mevcutSiparisler = [];
    }
  const mevcutSiparisNumaralari = new Set(mevcutSiparisler.map(s => s.trendyol_siparis_no));

  let yeniSiparisSayisi = 0;

  for (const trendyolSiparis of trendyolSiparisler) {
    // Sipariş numarasını farklı alanlardan alabilir
    const siparisNo = trendyolSiparis.orderNumber || 
                      trendyolSiparis.orderId?.toString() || 
                      `TY-${trendyolSiparis.orderId || Date.now()}`;

    // Zaten var mı kontrol et
    if (mevcutSiparisNumaralari.has(siparisNo)) {
      continue;
    }

    // Sipariş tarihi
    const siparisTarihi = trendyolSiparis.orderDate || 
                          trendyolSiparis.orderDateFormatted || 
                          new Date().toISOString();

    // Müşteri bilgileri
    const musteriAdi = trendyolSiparis.customerFirstName && trendyolSiparis.customerLastName
      ? `${trendyolSiparis.customerFirstName} ${trendyolSiparis.customerLastName}`
      : trendyolSiparis.customerFirstName || 
        trendyolSiparis.customerLastName || 
        'Müşteri Bilgisi Yok';

    // Adres bilgisi
    let adres = '';
    if (trendyolSiparis.shippingAddress) {
      const addr = trendyolSiparis.shippingAddress;
      adres = [
        addr.address1,
        addr.address2,
        addr.district,
        addr.city,
        addr.postalCode,
        addr.country
      ].filter(Boolean).join(' ');
    }

    // İptal olan siparişleri kontrol et ve sil
    if (trendyolSiparis.status === 'Cancelled' || trendyolSiparis.status === 'Canceled' || trendyolSiparis.status === 'Cancel') {
      const mevcutSiparisler = getAllSiparisler().filter(s => s.trendyol_siparis_no === siparisNo);
      if (mevcutSiparisler.length > 0) {
        try {
          const { deleteSiparis } = await import('../database/db.js');
          for (const mevcutSiparis of mevcutSiparisler) {
            if (mevcutSiparis.id !== undefined && mevcutSiparis.id !== null) {
              deleteSiparis(mevcutSiparis.id);
              console.log(`🗑️  İptal edilen sipariş silindi: ${siparisNo} (ID: ${mevcutSiparis.id})`);
            }
          }
        } catch (error: any) {
          console.error(`❌ İptal sipariş silinemedi: ${siparisNo}`, error.message);
        }
      }
      continue; // İptal olan siparişi işleme devam etme
    }

    // Sipariş satırları (lines)
    const lines = trendyolSiparis.lines || [];
    
    if (lines.length === 0) {
      // Eğer lines yoksa, siparişi tek bir kayıt olarak kaydet
      try {
        createSiparis({
          trendyol_siparis_no: siparisNo,
          siparis_tarihi: siparisTarihi,
          musteri_adi: musteriAdi,
          musteri_telefon: trendyolSiparis.customerPhoneNumber,
          musteri_adres: adres || undefined,
          urun_adi: 'Sipariş Detayı Yok',
          urun_kodu: undefined,
          miktar: 1,
          fiyat: 0,
          durum: 'Yeni',
          trendyol_data: JSON.stringify(trendyolSiparis),
        });
        yeniSiparisSayisi++;
      } catch (error: any) {
        console.error(`❌ Sipariş kaydedilemedi: ${siparisNo}`, error.message);
      }
    } else {
      // Her sipariş satırı için ayrı kayıt oluştur
      for (const line of lines) {
        try {
          const urunAdi = line.productName || line.barcode || 'Ürün Adı Yok';
          
          // 14 Ayar Altın filtresi - sadece 14 ayar altın içeren ürünleri kaydet
          const urunAdiLower = urunAdi.toLowerCase();
          const altin14Ayar = urunAdiLower.includes('14 ayar') || 
                             urunAdiLower.includes('14k') || 
                             urunAdiLower.includes('14-k') ||
                             urunAdiLower.includes('14 karat') ||
                             urunAdiLower.includes('14kt') ||
                             urunAdiLower.includes('14/585') ||
                             urunAdiLower.match(/14\s*ayar/i) !== null ||
                             urunAdiLower.match(/14\s*k/i) !== null;
          
          if (!altin14Ayar) {
            console.log(`⏭️  Sipariş atlandı (14 Ayar Altın değil): ${urunAdi.substring(0, 50)}`);
            continue; // Bu siparişi atla
          }
          
          // Model kodu - önce API'den gelen alanları kontrol et, sonra ürün adından çıkar
          let modelKodu: string | undefined = undefined;
          
          // 1. Önce API'den gelen modelCode veya productCode alanlarını kontrol et (öncelikli)
          const apiModelCode = (line as any).modelCode || 
                              (line as any).product?.modelCode ||
                              undefined;
          
          if (apiModelCode) {
            modelKodu = String(apiModelCode);
            console.log(`🔢 API'den modelCode alındı: ${modelKodu}`);
          }
          
          // 2. Eğer modelCode yoksa, ürün adından model kodunu çıkar (örn: "KPA38" -> "KPA38")
          if (!modelKodu) {
            const modelCodeMatch = urunAdi.match(/\b([A-Z]{2,}[0-9]+)\b/i);
            if (modelCodeMatch) {
              modelKodu = modelCodeMatch[1].toUpperCase();
              console.log(`🔢 Ürün adından model kodu çıkarıldı: ${modelKodu} (${urunAdi})`);
            }
          }
          
          // 3. Eğer hala bulunamadıysa, diğer alanları kontrol et (productCode, barcode, sku)
          if (!modelKodu) {
            modelKodu = line.productCode || 
                       (line as any).product?.code ||
                       line.barcode || 
                       (line as any).product?.barcode ||
                       (line as any).sku ||
                       (line as any).product?.sku ||
                       undefined;
            if (modelKodu) {
              modelKodu = String(modelKodu);
              console.log(`🔢 API'den diğer alanlardan model kodu alındı: ${modelKodu}`);
            }
          }
          
          // Trendyol API'den fotoğraf URL'ini al
          // Önce orders endpoint'inden gelen fotoğrafı kontrol et
          const lineAny = line as any;
          let urunResmi = line.productImageUrl || 
                         line.productImage || 
                         lineAny.imageUrl ||
                         lineAny.image ||
                         lineAny.productMainImage ||
                         lineAny.productMainImageUrl ||
                         lineAny.product?.imageUrl ||
                         lineAny.product?.mainImage ||
                         lineAny.productImage ||
                         lineAny.productImageUrl ||
                         undefined;
          
          // Eğer yoksa, Supabase'den çek (ürün adı ile birlikte - model kodu çıkarmak için)
          if (!urunResmi && modelKodu) {
            const productCodeStr = modelKodu.toString();
            // Önce cache'e bak
            urunResmi = getCachedProductImage(productCodeStr) || null;
            
            // Cache'de yoksa, Supabase'den çek (ürün adı ile birlikte)
            if (!urunResmi) {
              urunResmi = await fetchProductImage(modelKodu, urunAdi);
            }
          }
          
          console.log(`📸 Ürün fotoğrafı: ${urunResmi || 'Yok'} - Ürün: ${urunAdi.substring(0, 50)} - Model Kodu: ${modelKodu || 'Yok'}`);
          
          createSiparis({
            trendyol_siparis_no: siparisNo,
            siparis_tarihi: siparisTarihi,
            musteri_adi: musteriAdi,
            musteri_telefon: trendyolSiparis.customerPhoneNumber,
            musteri_adres: adres || undefined,
            urun_adi: urunAdi,
            urun_kodu: modelKodu ? String(modelKodu) : undefined,
            urun_resmi: urunResmi || undefined,
            miktar: line.quantity || 1,
            fiyat: line.salePrice || line.price || 0,
            durum: 'Yeni',
            platform: 'Trendyol',
            trendyol_data: JSON.stringify(trendyolSiparis),
          });
          yeniSiparisSayisi++;
        } catch (error: any) {
          console.error(`❌ Sipariş satırı kaydedilemedi: ${siparisNo}`, error.message);
        }
      }
    }
  }

  if (yeniSiparisSayisi > 0) {
    console.log(`✅ ${yeniSiparisSayisi} yeni sipariş kaydedildi.`);
  } else {
    console.log('ℹ️  Yeni sipariş bulunamadı.');
  }
  } catch (error: any) {
    console.error('❌ Sync hatası:', error.message);
    console.error('❌ Sync error stack:', error.stack);
  }
}

// Trendyol Webhook'u işle
export async function processTrendyolWebhook(webhookData: any) {
  try {
    console.log('📨 Trendyol webhook işleniyor...');
    console.log('📋 Webhook tipi:', webhookData.type || webhookData.eventType);
    
    // Sipariş oluşturma webhook'u
    if (webhookData.type === 'ORDER_CREATED' || webhookData.eventType === 'ORDER_CREATED') {
      const order = webhookData.order || webhookData;
      console.log('🆕 Yeni sipariş webhook\'u:', order.orderNumber || order.orderId);
      
      // Tek bir sipariş olarak işle
      await processSingleTrendyolOrder(order);
      
      console.log('✅ Webhook siparişi işlendi');
    } else {
      console.log('ℹ️  İşlenmeyen webhook tipi:', webhookData.type || webhookData.eventType);
    }
  } catch (error: any) {
    console.error('❌ Webhook işleme hatası:', error.message);
    console.error(error.stack);
  }
}

// Tek bir Trendyol siparişini işle
async function processSingleTrendyolOrder(trendyolSiparis: TrendyolSiparis) {
  try {
    const siparisNo = trendyolSiparis.orderNumber || 
                      trendyolSiparis.orderId?.toString() || 
                      `TY-${trendyolSiparis.orderId || Date.now()}`;

    // Mevcut siparişleri kontrol et
    const mevcutSiparisler = getAllSiparisler();
    const mevcutSiparisNumaralari = new Set(mevcutSiparisler.map(s => s.trendyol_siparis_no));
    
    // Zaten var mı kontrol et
    if (mevcutSiparisNumaralari.has(siparisNo)) {
      console.log('ℹ️  Sipariş zaten mevcut:', siparisNo);
      return;
    }

    // Sipariş tarihi
    const siparisTarihi = trendyolSiparis.orderDate || 
                          trendyolSiparis.orderDateFormatted || 
                          new Date().toISOString();

    // Müşteri bilgileri
    const musteriAdi = trendyolSiparis.customerFirstName && trendyolSiparis.customerLastName
      ? `${trendyolSiparis.customerFirstName} ${trendyolSiparis.customerLastName}`
      : trendyolSiparis.customerFirstName || 
        trendyolSiparis.customerLastName || 
        'Müşteri Bilgisi Yok';

    // Adres bilgisi
    let adres = '';
    if (trendyolSiparis.shippingAddress) {
      const addr = trendyolSiparis.shippingAddress;
      adres = [
        addr.address1,
        addr.address2,
        addr.district,
        addr.city,
        addr.postalCode,
        addr.country
      ].filter(Boolean).join(' ');
    }

    // Sipariş satırları (lines)
    const lines = trendyolSiparis.lines || [];
    
    if (lines.length === 0) {
      console.log('⚠️  Sipariş satırı yok:', siparisNo);
      return;
    }

    // Her sipariş satırı için ayrı kayıt oluştur
    for (const line of lines) {
      const urunAdi = line.productName || line.barcode || 'Ürün Adı Yok';
      
      // 14 Ayar Altın filtresi
      const urunAdiLower = urunAdi.toLowerCase();
      const altin14Ayar = urunAdiLower.includes('14 ayar') || 
                         urunAdiLower.includes('14k') || 
                         urunAdiLower.includes('14-k') ||
                         urunAdiLower.includes('14 karat') ||
                         urunAdiLower.includes('14kt') ||
                         urunAdiLower.includes('14/585') ||
                         urunAdiLower.match(/14\s*ayar/i) !== null ||
                         urunAdiLower.match(/14\s*k/i) !== null;
      
      if (!altin14Ayar) {
        console.log(`⏭️  Sipariş atlandı (14 Ayar Altın değil): ${urunAdi.substring(0, 50)}`);
        continue;
      }
      
      // Model kodu çıkar
      let modelKodu: string | undefined = undefined;
      
      // API'den model kodu
      const apiModelCode = (line as any).modelCode || 
                          (line as any).product?.modelCode ||
                          undefined;
      
      if (apiModelCode) {
        modelKodu = String(apiModelCode);
      }
      
      // Ürün adından model kodu
      if (!modelKodu) {
        const modelCodeMatch = urunAdi.match(/\b([A-Z]{2,}[0-9]+)\b/i);
        if (modelCodeMatch) {
          modelKodu = modelCodeMatch[1].toUpperCase();
        }
      }
      
      // Diğer alanlardan model kodu
      if (!modelKodu) {
        modelKodu = line.productCode || 
                   (line as any).product?.code ||
                   line.barcode || 
                   (line as any).product?.barcode ||
                   (line as any).sku ||
                   (line as any).product?.sku ||
                   undefined;
        if (modelKodu) {
          modelKodu = String(modelKodu);
        }
      }
      
      // Ürün fotoğrafı
      const lineAny = line as any;
      let urunResmi = line.productImageUrl || 
                     line.productImage || 
                     lineAny.imageUrl ||
                     lineAny.image ||
                     lineAny.productMainImage ||
                     lineAny.productMainImageUrl ||
                     lineAny.product?.imageUrl ||
                     lineAny.product?.mainImage ||
                     undefined;
      
      // Supabase'den fotoğraf çek
      if (!urunResmi && modelKodu) {
        urunResmi = await fetchProductImage(modelKodu, urunAdi);
      }
      
      createSiparis({
        trendyol_siparis_no: siparisNo,
        siparis_tarihi: siparisTarihi,
        musteri_adi: musteriAdi,
        musteri_telefon: trendyolSiparis.customerPhoneNumber,
        musteri_adres: adres || undefined,
        urun_adi: urunAdi,
        urun_kodu: modelKodu ? String(modelKodu) : undefined,
        urun_resmi: urunResmi || undefined,
        miktar: line.quantity || 1,
        fiyat: line.salePrice || line.price || 0,
        durum: 'Yeni',
        platform: 'Trendyol',
        trendyol_data: JSON.stringify(trendyolSiparis),
      });
      
      console.log(`✅ Webhook siparişi eklendi: ${siparisNo} - ${urunAdi.substring(0, 50)}`);
    }
  } catch (error: any) {
    console.error('❌ Tek sipariş işleme hatası:', error.message);
    console.error(error.stack);
  }
}

export function startTrendyolSync() {
  // NOT: Webhook kullanıldığı için otomatik sync'i devre dışı bıraktık
  // Sadece ilk başlangıçta son 7 günlük siparişleri çek
  console.log('🔄 Trendyol webhook modu aktif - sadece başlangıç sync\'i yapılıyor');
  
  // İlk çalıştırma
  setTimeout(() => {
    console.log('🚀 Trendyol başlangıç sync\'i (webhook için)');
    syncTrendyolSiparisler();
  }, 2000);
  
  // Her 6 saatte bir yedek sync (webhook kaçırma durumu için)
  cron.schedule('0 */6 * * *', () => {
    console.log('🔄 Trendyol yedek sync (webhook backup)');
    syncTrendyolSiparisler();
  });
}
