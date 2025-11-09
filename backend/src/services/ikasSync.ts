import axios from 'axios';
import { createSiparis, getAllSiparisler } from '../database/db.js';
import { fetchProductImage } from './trendyolSync.js';

// Ikas API credentials - Railway environment variables'dan alınır
const IKAS_CLIENT_ID = process.env.IKAS_CLIENT_ID;
const IKAS_CLIENT_SECRET = process.env.IKAS_CLIENT_SECRET;
const IKAS_API_BASE_URL = process.env.IKAS_API_BASE_URL || 'https://api.myikas.com';

// Credentials kontrolü
if (!IKAS_CLIENT_ID || !IKAS_CLIENT_SECRET) {
  console.warn('⚠️  Ikas API credentials tanımlı değil. IKAS_CLIENT_ID ve IKAS_CLIENT_SECRET environment variables ayarlayın.');
}

// OAuth token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// Ikas API'den OAuth token al
async function getIkasAccessToken(): Promise<string | null> {
  try {
    // Credentials kontrolü
    if (!IKAS_CLIENT_ID || !IKAS_CLIENT_SECRET) {
      console.error('❌ Ikas credentials tanımlı değil');
      return null;
    }

    // Token henüz geçerliyse, cache'den döndür
    if (accessToken && Date.now() < tokenExpiry) {
      return accessToken;
    }

    console.log('🔐 Ikas API token alınıyor...');
    console.log(`🔑 Client ID: ${IKAS_CLIENT_ID.substring(0, 20)}...`);
    
    // Ikas API form-urlencoded format bekliyor
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', IKAS_CLIENT_ID);
    params.append('client_secret', IKAS_CLIENT_SECRET);
    
    // Ikas API OAuth token endpoint: /api/admin/oauth/token
    const tokenUrl = `${IKAS_API_BASE_URL}/api/admin/oauth/token`;
    console.log(`📤 Token isteği gönderiliyor: ${tokenUrl}`);
    
    const response = await axios.post(
      tokenUrl,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data?.access_token) {
      accessToken = response.data.access_token;
      // Token expiry'yi hesapla (varsayılan 3600 saniye)
      const expiresIn = response.data.expires_in || 3600;
      tokenExpiry = Date.now() + (expiresIn - 60) * 1000; // 60 saniye önceden expire et
      console.log('✅ Ikas API token alındı');
      return accessToken;
    }

    console.error('❌ Ikas API token alınamadı:', response.data);
    return null;
  } catch (error: any) {
    console.error('❌ Ikas API token hatası:');
    console.error('   Status:', error.response?.status);
    console.error('   Status Text:', error.response?.statusText);
    console.error('   Data:', error.response?.data);
    console.error('   URL:', error.config?.url);
    console.error('   Message:', error.message);
    return null;
  }
}

// Ikas API'den siparişleri çek (GraphQL kullanarak)
async function fetchIkasSiparisler(): Promise<any[]> {
  try {
    const token = await getIkasAccessToken();
    if (!token) {
      console.error('❌ Ikas API token alınamadı');
      return [];
    }

    // Son 7 günlük siparişler
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`📅 Ikas siparişleri çekiliyor: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // Ikas GraphQL endpoint: /api/v1/admin/graphql
    const graphqlUrl = `${IKAS_API_BASE_URL}/api/v1/admin/graphql`;
    
    console.log(`🔗 Ikas GraphQL URL: ${graphqlUrl}`);
    if (IKAS_CLIENT_ID) {
    console.log(`🔑 Ikas Client ID: ${IKAS_CLIENT_ID.substring(0, 20)}...`);
    }

    // GraphQL query
    const query = `
      query listOrder($orderedAt: DateFilterInput, $pagination: PaginationInput) {
        listOrder(orderedAt: $orderedAt, pagination: $pagination) {
          count
          hasNext
          page
          limit
          data {
            id
            orderNumber
            orderedAt
            status
            customer {
              firstName
              lastName
              email
              phone
            }
            billingAddress {
              firstName
              lastName
              addressLine1
              addressLine2
              city {
                name
              }
              district {
                name
              }
              state {
                name
              }
              country {
                name
              }
              postalCode
              phone
            }
            shippingAddress {
              firstName
              lastName
              addressLine1
              addressLine2
              city {
                name
              }
              district {
                name
              }
              state {
                name
              }
              country {
                name
              }
              postalCode
              phone
            }
            orderLineItems {
              id
              quantity
              price
              finalPrice
              options {
                name
                type
              }
              variant {
                id
                name
                sku
                barcodeList
                productId
              }
            }
          }
        }
      }
    `;

    const variables = {
      orderedAt: {
        gte: startDate.getTime(), // Timestamp (ms) - 7 gün önce
        lte: endDate.getTime() // Timestamp (ms) - bugün
      },
      pagination: {
        page: 1,
        limit: 100
      }
    };

    const response = await axios.post(
      graphqlUrl,
      {
        query,
        variables
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`📥 Ikas GraphQL Response Status: ${response.status}`);
    
    // GraphQL response formatını kontrol et
    if (response.data?.errors) {
      console.error('❌ Ikas GraphQL hataları:', JSON.stringify(response.data.errors, null, 2));
      
      // GraphQL validation hatalarını detaylı logla
      response.data.errors.forEach((error: any) => {
        console.error(`❌ GraphQL Error: ${error.message}`);
        if (error.locations) {
          console.error(`   Locations:`, JSON.stringify(error.locations));
        }
        if (error.extensions) {
          console.error(`   Extensions:`, JSON.stringify(error.extensions));
        }
      });
      
      // GraphQL hatası varsa crash'i önlemek için boş array döndür
      return [];
    }
    
    const listOrderData = response.data?.data?.listOrder;
    if (!listOrderData) {
      console.error('❌ Ikas GraphQL response formatı beklenmeyen:', JSON.stringify(response.data).substring(0, 500));
      return [];
    }
    
    const siparisler = listOrderData.data || [];
    
    console.log(`📦 Ikas: ${siparisler.length} sipariş bulundu (toplam: ${listOrderData.count}, sayfa: ${listOrderData.page})`);
    
    if (siparisler.length > 0) {
      // Options olan siparişleri bul ve detaylı log'la
      for (const siparis of siparisler) {
        if (siparis.orderLineItems && Array.isArray(siparis.orderLineItems)) {
          for (const lineItem of siparis.orderLineItems) {
            if (lineItem.options && Array.isArray(lineItem.options) && lineItem.options.length > 0) {
              console.log(`🔍 Options olan sipariş bulundu: ${siparis.orderNumber || siparis.id}`);
              console.log(`📋 Sipariş tam verisi:`, JSON.stringify(siparis, null, 2));
              console.log(`📋 Line item tam verisi:`, JSON.stringify(lineItem, null, 2));
              console.log(`📋 Options detaylı:`, JSON.stringify(lineItem.options, null, 2));
              break; // İlk options olan siparişi bulduk, yeterli
            }
          }
        }
      }
      
      console.log(`📝 İlk Ikas sipariş örneği:`, JSON.stringify(siparisler[0], null, 2));
      
      // İlk siparişin orderLineItems'ını detaylı log'la
      if (siparisler[0].orderLineItems && siparisler[0].orderLineItems.length > 0) {
        console.log(`📋 İlk Ikas siparişinin orderLineItems:`, JSON.stringify(siparisler[0].orderLineItems[0], null, 2));
      }
    }
    
    return siparisler;
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Ikas API hatası:', error.response.status);
      console.error('❌ Response Data:', JSON.stringify(error.response.data).substring(0, 500));
      console.error('❌ Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('❌ Ikas request yapılamadı:', error.message);
      console.error('❌ Request URL:', error.config?.url);
    } else {
      console.error('❌ Ikas error:', error.message);
      console.error('❌ Error Stack:', error.stack);
    }
    return [];
  }
}

// Ikas siparişlerini senkronize et
async function syncIkasSiparisler() {
  try {
    console.log('🔄 Ikas siparişleri senkronize ediliyor...');
    
    const ikasSiparisler = await fetchIkasSiparisler();
    let mevcutSiparisler: any[] = [];
    try {
      mevcutSiparisler = getAllSiparisler();
    } catch (getAllError: any) {
      console.error('❌ Mevcut siparişler alınamadı:', getAllError.message);
      mevcutSiparisler = [];
    }
    
    const mevcutSiparisNumaralari = new Set(mevcutSiparisler.map(s => s.trendyol_siparis_no));

    let yeniSiparisSayisi = 0;
    let filtrelenmisSiparisSayisi = 0;

    for (const ikasSiparis of ikasSiparisler) {
      // Sipariş numarası (GraphQL'den gelen format)
      const siparisNo = ikasSiparis.orderNumber || 
                        ikasSiparis.id?.toString() || 
                        `IKAS-${ikasSiparis.id || Date.now()}`;

      // Zaten var mı kontrol et
      if (mevcutSiparisNumaralari.has(siparisNo)) {
        continue;
      }

      // Sipariş tarihi (timestamp ms olarak geliyor)
      const siparisTarihi = ikasSiparis.orderedAt || Date.now();

      // Müşteri bilgileri (GraphQL format)
      const musteriAdi = ikasSiparis.customer?.firstName && ikasSiparis.customer?.lastName
        ? `${ikasSiparis.customer.firstName} ${ikasSiparis.customer.lastName}`
        : ikasSiparis.customer?.firstName ||
          ikasSiparis.customer?.lastName ||
          ikasSiparis.billingAddress?.firstName && ikasSiparis.billingAddress?.lastName
            ? `${ikasSiparis.billingAddress.firstName} ${ikasSiparis.billingAddress.lastName}`
            : 'Müşteri Bilgisi Yok';

      // Adres bilgisi (shipping address öncelikli, GraphQL format)
      let adres = '';
      const addr = ikasSiparis.shippingAddress || ikasSiparis.billingAddress;
      if (addr) {
        adres = [
          addr.addressLine1,
          addr.addressLine2,
          addr.district?.name,
          addr.city?.name,
          addr.state?.name,
          addr.country?.name,
          addr.postalCode
        ].filter(Boolean).join(' ');
      }

      // Sipariş satırları (orderLineItems, GraphQL format)
      const lineItems = ikasSiparis.orderLineItems || [];

      // Her satır için sipariş oluştur
      for (const line of lineItems) {
        const variant = line.variant || {};
        const urunAdi = variant.name || 'Ürün Adı Yok';

        // "14 Ayar Altın" filtresi
        const altinAramalari = ['14 Ayar Altın', '14 AYAR ALTIN', '14 Ayar', '14 ayar altın', '14 AYAR'];
        const urunAdiLower = urunAdi.toLowerCase();
        const altinGecen = altinAramalari.some(arama => 
          urunAdiLower.includes(arama.toLowerCase())
        );

        if (!altinGecen) {
          filtrelenmisSiparisSayisi++;
          continue;
        }

        // Ürün kodu (SKU öncelikli, sonra barcode)
        const urunKodu = variant.sku || 
                         variant.barcodeList?.[0] ||
                         undefined;

        // Model kodu çıkarma
        let modelKodu: string | undefined = undefined;
        if (variant.sku) {
          modelKodu = String(variant.sku);
        } else if (variant.barcodeList?.[0]) {
          modelKodu = String(variant.barcodeList[0]);
        } else {
          // Ürün adından model kodu çıkar (örn: "KPA38" -> "KPA38")
          const modelCodeMatch = urunAdi.match(/\b([A-Z]{2,}[0-9]+)\b/i);
          if (modelCodeMatch) {
            modelKodu = modelCodeMatch[1].toUpperCase();
          }
        }

        // Miktar
        const miktar = line.quantity || 1;

        // Fiyat (finalPrice öncelikli)
        const fiyat = line.finalPrice || line.price || 0;

        // Ürün fotoğrafı
        const urunResmi = await fetchProductImage(
          urunKodu || modelKodu || urunAdi,
          urunAdi
        );

        // Kişiselleştirme bilgileri (sadece options mevcut)
        const kisisellestirmeBilgileri: any = {};
        if (line.options && Array.isArray(line.options) && line.options.length > 0) {
          kisisellestirmeBilgileri.options = line.options;
          console.log(`📝 Ikas options bulundu (${siparisNo}):`, JSON.stringify(line.options, null, 2));
          
          // Her option'ı detaylı log'la
          line.options.forEach((opt: any, index: number) => {
            console.log(`📋 Option ${index + 1} (${siparisNo}):`, JSON.stringify(opt, null, 2));
            console.log(`   - name: ${opt.name}`);
            console.log(`   - type: ${opt.type}`);
            console.log(`   - Tüm keys: ${Object.keys(opt).join(', ')}`);
            
            // Tüm key-value çiftlerini logla
            Object.keys(opt).forEach((key) => {
              const value = opt[key];
              if (value !== undefined && value !== null) {
                console.log(`   - ${key}:`, typeof value === 'object' ? JSON.stringify(value) : value);
              }
            });
          });
        }
        
        // Tüm line item'ı log'la (kişiselleştirme bilgilerini görmek için)
        if (line.options && Array.isArray(line.options) && line.options.length > 0) {
          console.log(`📋 Ikas line item tam verisi (${siparisNo}):`, JSON.stringify(line, null, 2));
        }
        
        const kisisellestirmeStr = Object.keys(kisisellestirmeBilgileri).length > 0
          ? JSON.stringify(kisisellestirmeBilgileri)
          : undefined;
        
        // Kişiselleştirme bilgilerini okunabilir formata çevir
        let kisisellestirmeNotu = '';
        if (kisisellestirmeStr) {
          try {
            const kisisellestirmeObj = JSON.parse(kisisellestirmeStr);
            const notSatirlari: string[] = [];
            
            // Options varsa (sadece options mevcut)
            if (kisisellestirmeObj.options) {
              if (Array.isArray(kisisellestirmeObj.options)) {
                kisisellestirmeObj.options.forEach((opt: any) => {
                  if (opt.name) {
                    // Name alanında değer olabilir (örn: "Yazı: Ahmet", "Renk: Kırmızı")
                    // Veya name sadece etiket, değer başka bir alanda olabilir
                    let degerStr = '';
                    
                    // Tüm alanları kontrol et (value, values, data, text, vb.)
                    if (opt.value !== undefined && opt.value !== null && opt.value !== '') {
                      degerStr = `: ${opt.value}`;
                    } else if (opt.values && Array.isArray(opt.values) && opt.values.length > 0) {
                      const degerler = opt.values.map((v: any) => {
                        if (typeof v === 'object' && v !== null) {
                          return v.value || v.name || v.text || JSON.stringify(v);
                        }
                        return v;
                      }).filter((v: any) => v != null && v !== '');
                      if (degerler.length > 0) {
                        degerStr = `: ${degerler.join(', ')}`;
                      }
                    } else if (opt.data !== undefined && opt.data !== null && opt.data !== '') {
                      degerStr = `: ${opt.data}`;
                    } else if (opt.text !== undefined && opt.text !== null && opt.text !== '') {
                      degerStr = `: ${opt.text}`;
                    }
                    
                    // Eğer name içinde zaten değer varsa (örn: "Yüzük Ölçüsü: 10")
                    if (!degerStr && opt.name.includes(':')) {
                      // Name zaten değer içeriyor, direkt kullan
                      notSatirlari.push(`⚙️ ${opt.name}`);
                    } else {
                      const typeStr = opt.type ? ` (${opt.type})` : '';
                      notSatirlari.push(`⚙️ ${opt.name}${degerStr}${typeStr}`);
                    }
                  } else if (typeof opt === 'string') {
                    notSatirlari.push(`⚙️ ${opt}`);
                  } else {
                    // Bilinmeyen format, tüm objeyi string'e çevir
                    notSatirlari.push(`⚙️ ${JSON.stringify(opt)}`);
                  }
                });
              } else if (typeof kisisellestirmeObj.options === 'object') {
                Object.entries(kisisellestirmeObj.options).forEach(([key, value]) => {
                  notSatirlari.push(`⚙️ ${key}: ${value}`);
                });
              }
            }
            
            if (notSatirlari.length > 0) {
              kisisellestirmeNotu = '🎯 Kişiselleştirme:\n' + notSatirlari.join('\n');
            }
          } catch (parseError: any) {
            console.error(`❌ Kişiselleştirme parse hatası (${siparisNo}):`, parseError.message);
            // Parse hatası olsa bile JSON'u direkt ekle
            kisisellestirmeNotu = '🎯 Kişiselleştirme:\n' + kisisellestirmeStr;
          }
        }
        
        if (kisisellestirmeStr) {
          console.log(`✅ Ikas kişiselleştirme bilgisi kaydedildi (${siparisNo}):`, kisisellestirmeStr.substring(0, 200));
          if (kisisellestirmeNotu) {
            console.log(`📝 Kişiselleştirme notu oluşturuldu (${siparisNo}):`, kisisellestirmeNotu.substring(0, 200));
          }
        } else {
          console.log(`ℹ️  Ikas siparişinde kişiselleştirme bilgisi yok (${siparisNo})`);
        }

        // Sipariş oluştur
        try {
          // Sipariş tarihini string'e çevir (epoch milliseconds)
          const siparisTarihiStr = typeof siparisTarihi === 'number' 
            ? siparisTarihi.toString()
            : (typeof siparisTarihi === 'string' 
              ? new Date(siparisTarihi).getTime().toString()
              : Date.now().toString());

          createSiparis({
            trendyol_siparis_no: siparisNo,
            siparis_tarihi: siparisTarihiStr,
            musteri_adi: musteriAdi,
            musteri_adres: adres,
            urun_adi: urunAdi,
            urun_kodu: urunKodu,
            miktar: miktar,
            urun_resmi: urunResmi || undefined,
            durum: 'Yeni',
            fiyat: fiyat,
            platform: 'Ikas',
            ikas_data: JSON.stringify(ikasSiparis),
            kisisellestirme: kisisellestirmeStr,
            not: kisisellestirmeNotu || undefined,
          });

          yeniSiparisSayisi++;
          console.log(`✅ Ikas sipariş eklendi: ${siparisNo} - ${urunAdi}`);
        } catch (createError: any) {
          console.error(`❌ Ikas sipariş oluşturma hatası (${siparisNo}):`, createError.message);
        }
      }
    }

    console.log(`✅ Ikas senkronizasyon tamamlandı:`);
    console.log(`   - Yeni sipariş: ${yeniSiparisSayisi}`);
    console.log(`   - Filtrelenen: ${filtrelenmisSiparisSayisi}`);
    console.log(`   - Toplam işlenen: ${ikasSiparisler.length}`);

  } catch (error: any) {
    console.error('❌ Ikas senkronizasyon hatası:', error.message);
    console.error('❌ Error Stack:', error.stack);
  }
}

// Otomatik senkronizasyon başlat
export function startIkasSync() {
  try {
    console.log('🚀 Ikas senkronizasyon başlatılıyor...');
    
    // İlk senkronizasyon (async olarak, hata olsa bile devam et)
    syncIkasSiparisler().catch((error: any) => {
      console.error('❌ İlk Ikas senkronizasyon hatası:', error.message);
      console.error('❌ Error Stack:', error.stack);
      // Crash'i önlemek için hata yakalanıyor
    });
    
    // Her 30 dakikada bir senkronize et
    setInterval(() => {
      syncIkasSiparisler().catch((error: any) => {
        console.error('❌ Ikas periyodik senkronizasyon hatası:', error.message);
        console.error('❌ Error Stack:', error.stack);
        // Crash'i önlemek için hata yakalanıyor
      });
    }, 30 * 60 * 1000);
  } catch (error: any) {
    console.error('❌ Ikas sync başlatma hatası:', error.message);
    console.error('❌ Error Stack:', error.stack);
    // Crash'i önlemek için hata yakalanıyor
  }
}

export { syncIkasSiparisler, fetchIkasSiparisler };

