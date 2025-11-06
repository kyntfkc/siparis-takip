import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

// Local image storage path
const IMAGE_STORAGE_PATH = join(process.cwd(), 'public/product-images');

// Klasörü oluştur
function ensureDirectory() {
  if (!existsSync(IMAGE_STORAGE_PATH)) {
    mkdirSync(IMAGE_STORAGE_PATH, { recursive: true });
    console.log('📁 Product images klasörü oluşturuldu');
  }
}

// Local'de fotoğraf var mı kontrol et
export function getLocalImagePath(productCode: string): string | null {
  ensureDirectory();
  const imagePath = join(IMAGE_STORAGE_PATH, `${productCode}.jpg`);
  if (existsSync(imagePath)) {
    return `/images/${productCode}.jpg`;
  }
  return null;
}

// Fotoğrafı local'e kaydet
export async function saveImageLocally(productCode: string, imageUrl: string): Promise<string | null> {
  try {
    ensureDirectory();

    // Fotoğrafı indir
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    // Local'e kaydet
    const imagePath = join(IMAGE_STORAGE_PATH, `${productCode}.jpg`);
    writeFileSync(imagePath, response.data);
    
    console.log(`💾 Fotoğraf kaydedildi: ${productCode}.jpg`);
    return `/images/${productCode}.jpg`;
  } catch (error: any) {
    console.error(`❌ Fotoğraf kaydedilemedi (${productCode}):`, error.message);
    return null;
  }
}

