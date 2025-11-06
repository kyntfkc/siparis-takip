import { createClient } from '@supabase/supabase-js';

let supabase: any = null;

// Supabase client oluştur
function getSupabaseClient() {
  // process.env değerlerini her seferinde güncel olarak oku (lazy loading)
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_KEY || '';
  
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials eksik (SUPABASE_URL veya SUPABASE_KEY)');
      console.warn(`⚠️  SUPABASE_URL: ${supabaseUrl ? 'VAR' : 'YOK'}`);
      console.warn(`⚠️  SUPABASE_KEY: ${supabaseKey ? 'VAR' : 'YOK'}`);
      return null;
    }
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client oluşturuldu');
    } catch (error: any) {
      console.error('❌ Supabase client oluşturulamadı:', error.message);
      return null;
    }
  }
  return supabase;
}

// Bucket name'i lazy olarak oku
function getBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || 'siparis-takip-foto';
}

/**
 * Ürün koduna göre Supabase Storage'dan fotoğraf URL'i al
 * Fotoğraf formatı: {urun_kodu}.jpg, {urun_kodu}.png, {urun_kodu}ZZ.jpg, {urun_kodu}ZZ.png
 */
export async function getProductImageFromSupabase(productCode: string | number, productName?: string): Promise<string | null> {
  try {
    const bucketName = getBucketName();
    console.log(`🔍 Supabase'den fotoğraf aranıyor: ${productCode} (${productName || 'ürün adı yok'})`);
    console.log(`🔍 Bucket adı: ${bucketName}`);
    const client = getSupabaseClient();
    if (!client) {
      console.warn('⚠️  Supabase client yapılandırılmamış');
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_KEY || '';
      console.warn(`⚠️  SUPABASE_URL: ${supabaseUrl ? 'VAR' : 'YOK'}`);
      console.warn(`⚠️  SUPABASE_KEY: ${supabaseKey ? 'VAR' : 'YOK'}`);
      return null;
    }

    const productCodeStr = productCode.toString();
    
    // Arama sırası (öncelik sırasına göre):
    // 1. Ürün adından model kodu çıkar + ZZ (en yüksek öncelik - KPA38ZZ.jpg gibi)
    // 2. Ürün kodu + ZZ
    // 3. Direkt ürün kodu
    const searchPatterns: string[] = [];
    
    // Ürün adından model kodunu çıkar (örn: "KPA38" -> "KPA38ZZ") - ÖNCELİK 1
    if (productName) {
      // Ürün adından model kodunu bul (harfler + sayılar, örn: KPA38, KPA4, vb.)
      const modelCodeMatch = productName.match(/\b([A-Z]{2,}[0-9]+)\b/i);
      if (modelCodeMatch) {
        const modelCode = modelCodeMatch[1].toUpperCase();
        // Model kodu + ZZ pattern'lerini en başa ekle (öncelikli)
        searchPatterns.push(
          `${modelCode}ZZ.jpg`,
          `${modelCode}ZZ.png`,
          `${modelCode}.jpg`,
          `${modelCode}.png`
        );
        console.log(`🔍 Ürün adından model kodu çıkarıldı: ${modelCode} (${productName})`);
      }
    }
    
    // Ürün kodu + ZZ (öncelik 2)
    searchPatterns.push(
      `${productCodeStr}ZZ.jpg`,
      `${productCodeStr}ZZ.png`
    );
    
    // Direkt ürün kodu (öncelik 3)
    searchPatterns.push(
      `${productCodeStr}.jpg`,
      `${productCodeStr}.png`
    );
    
    // Dosyalar artık root klasöründe, sadece root'ta ara
    // Önce bucket'taki tüm dosyaları listele ve eşleşen dosyayı bul
    try {
      const { data: files, error: listError } = await client
        .storage
        .from(getBucketName())
        .list('', {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) {
        console.warn(`⚠️  Supabase list hatası:`, listError.message);
        console.warn(`⚠️  Bucket name: ${getBucketName()}`);
        // Liste alınamazsa, pattern'leri sırayla deneyip URL döndür (fallback)
        for (const pattern of searchPatterns) {
          try {
            const { data: urlData } = client
              .storage
              .from(getBucketName())
              .getPublicUrl(pattern);
            if (urlData?.publicUrl) {
              console.log(`⚠️  Liste alınamadı, fallback URL döndürülüyor: ${productCode} -> ${pattern}`);
              return urlData.publicUrl;
            }
          } catch (fallbackError: any) {
            continue;
          }
        }
        return null;
      }

      // Debug: İlk aranmada dosyaları logla (her zaman göster)
      console.log(`📋 Bucket'taki dosyalar (${files?.length || 0} adet):`, files?.slice(0, 10).map((f: any) => f.name).join(', '));
      console.log(`🔍 Aranan pattern'ler (${productCodeStr}):`, searchPatterns);
      console.log(`🔍 Bucket name: ${getBucketName()}`);

      // Eğer dosya listesi boşsa, fallback olarak direkt URL'leri döndür
      if (!files || files.length === 0) {
        console.warn(`⚠️  Bucket boş görünüyor veya list() yetki sorunu var. Fallback olarak direkt URL'ler deneniyor...`);
        for (const pattern of searchPatterns) {
          try {
            const { data: urlData } = client
              .storage
              .from(getBucketName())
              .getPublicUrl(pattern);
            if (urlData?.publicUrl) {
              console.log(`⚠️  Fallback URL döndürülüyor: ${productCode} -> ${pattern}`);
              return urlData.publicUrl;
            }
          } catch (fallbackError: any) {
            continue;
          }
        }
        return null;
      }

      // Dosya adlarını küçük harfe çevir (büyük/küçük harf duyarsız karşılaştırma için)
      const fileNames = files?.map((f: any) => f.name.toLowerCase()) || [];
      
      // Pattern'leri sırayla kontrol et
      for (const pattern of searchPatterns) {
        const patternLower = pattern.toLowerCase();
        
        // Dosya adıyla eşleşen dosyayı bul
        const matchingFile = files?.find((f: any) => f.name.toLowerCase() === patternLower);
        
        if (matchingFile) {
          // Dosya bulundu, public URL oluştur
          const { data: urlData } = client
            .storage
            .from(getBucketName())
            .getPublicUrl(matchingFile.name);
          
          if (urlData?.publicUrl) {
            console.log(`✅ Supabase'de fotoğraf bulundu (root): ${productCode} -> ${matchingFile.name}`);
            return urlData.publicUrl;
          }
        }
      }
      
      // Debug: Eğer dosya bulunamadıysa, benzer dosyaları göster
      if (files && files.length > 0) {
        const similarFiles = files.filter((f: any) => {
          const fileName = f.name.toLowerCase();
          return fileName.includes(productCodeStr.toLowerCase()) || 
                 searchPatterns.some(p => fileName.includes(p.toLowerCase().replace('.jpg', '').replace('.png', '')));
        });
        if (similarFiles.length > 0) {
          console.log(`🔍 Benzer dosyalar bulundu:`, similarFiles.map((f: any) => f.name).join(', '));
        }
      }
    } catch (error: any) {
      console.error(`❌ Supabase list kontrolü hatası:`, error.message);
      // Hata olursa, ilk pattern'i deneyip URL döndür (fallback)
      const firstPattern = searchPatterns[0];
      if (firstPattern) {
        try {
          const { data: urlData } = client
            .storage
            .from(getBucketName())
            .getPublicUrl(firstPattern);
          if (urlData?.publicUrl) {
            console.log(`⚠️  Hata oluştu, fallback URL döndürülüyor: ${productCode} -> ${firstPattern}`);
            return urlData.publicUrl;
          }
        } catch (fallbackError: any) {
          console.error(`❌ Fallback URL oluşturulamadı:`, fallbackError.message);
        }
      }
    }

    console.log(`⚠️  Supabase'de fotoğraf bulunamadı: ${productCode} (${productName || 'ürün adı yok'})`);
    return null;
  } catch (error: any) {
    console.error(`❌ Supabase Storage hatası (${productCode}):`, error.message);
    return null;
  }
}

/**
 * Supabase Storage'daki tüm fotoğrafları listele
 */
export async function listAllProductImages(): Promise<string[]> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return [];
    }

    const { data, error } = await client
      .storage
      .from(getBucketName())
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('❌ Supabase list hatası:', error);
      return [];
    }

    return data?.map((file: any) => file.name) || [];
  } catch (error: any) {
    console.error('❌ Supabase list hatası:', error.message);
    return [];
  }
}

/**
 * Fotoğrafı Supabase Storage'a yükle (opsiyonel - eğer yüklemek isterseniz)
 */
export async function uploadProductImageToSupabase(
  productCode: string | number,
  imageBuffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      console.warn('⚠️  Supabase client yapılandırılmamış');
      return null;
    }

    const productCodeStr = productCode.toString();
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `${productCodeStr}.${extension}`;

    const { data, error } = await client
      .storage
      .from(getBucketName())
      .upload(fileName, imageBuffer, {
        contentType,
        upsert: true // Varsa üzerine yaz
      });

    if (error) {
      console.error(`❌ Supabase upload hatası (${productCode}):`, error);
      return null;
    }

    // Public URL al
    const { data: urlData } = client
      .storage
      .from(getBucketName())
      .getPublicUrl(fileName);

    if (urlData?.publicUrl) {
      console.log(`✅ Fotoğraf Supabase'e yüklendi: ${productCode}`);
      return urlData.publicUrl;
    }

    return null;
  } catch (error: any) {
    console.error(`❌ Supabase upload hatası (${productCode}):`, error.message);
    return null;
  }
}

