// Image URL helper - Railway'de görsellerin doğru yüklenmesi için
export function getImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  
  // Eğer zaten tam URL ise (http/https ile başlıyorsa), direkt döndür
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Eğer relative path ise (örn: /images/...), Railway domain'i ile birleştir
  if (imageUrl.startsWith('/')) {
    // Production'da window.location.origin kullan
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${imageUrl}`;
    }
    return imageUrl;
  }
  
  return imageUrl;
}

// CORS sorunlarını önlemek için proxy URL oluştur (gerekirse)
export function getImageUrlWithProxy(imageUrl: string | null | undefined): string | null {
  const url = getImageUrl(imageUrl);
  if (!url) return null;
  
  // Eğer Supabase Storage URL'i ise ve CORS sorunu varsa, backend proxy kullan
  if (url.includes('supabase.co') && url.includes('/storage/')) {
    // Backend'de bir proxy endpoint'i varsa kullanılabilir
    // Şimdilik direkt URL'i döndür
    return url;
  }
  
  return url;
}


