export interface SertifikaAyarlari {
  fotoğrafKonumu: 'sol-ust' | 'sol-alt' | 'sag-ust' | 'sag-alt';
  fotoğrafGenislik: string;
  fotoğrafYukseklik: string;
  solBölümHizalama: 'sol' | 'orta' | 'sag';
  solBölümPadding: string;
  ürünAdıFontBoyutu: string;
  ürünKoduFontBoyutu: string;
  altınAyarıFontBoyutu: string;
  sagBölümHizalama: 'sol' | 'orta' | 'sag';
  sagBölümPadding: string;
  müşteriBilgisiFontBoyutu: string;
  bilgiSatırAraligi: string;
  sayfaGenislik: string;
  sayfaYukseklik: string;
  genelPadding: string;
  // Hassas pozisyon ayarları (cm cinsinden)
  fotoğrafX?: string; // cm
  fotoğrafY?: string; // cm
  ürünAdıX?: string; // cm
  ürünAdıY?: string; // cm
  ürünKoduX?: string; // cm
  ürünKoduY?: string; // cm
  altınAyarıX?: string; // cm
  altınAyarıY?: string; // cm
  müşteriAdıX?: string; // cm
  müşteriAdıY?: string; // cm
  siparişTarihiX?: string; // cm
  siparişTarihiY?: string; // cm
  platformX?: string; // cm
  platformY?: string; // cm
  siparişNoX?: string; // cm
  siparişNoY?: string; // cm
  // Referans görsel
  referansGorsel?: string; // Base64 veya URL
  // Sürükle-bırak ile ayarlanan pozisyonlar (pixel cinsinden, sayfa boyutuna göre normalize edilir)
  fotoğrafPozisyon?: { x: number; y: number }; // 0-100 arası yüzde
  ürünBilgisiPozisyon?: { x: number; y: number }; // 0-100 arası yüzde
  müşteriBilgisiPozisyon?: { x: number; y: number }; // 0-100 arası yüzde
}

export const varsayilanAyarlar: SertifikaAyarlari = {
  fotoğrafKonumu: 'sol-ust',
  fotoğrafGenislik: '3.5',
  fotoğrafYukseklik: '3.5',
  solBölümHizalama: 'orta',
  solBölümPadding: '0.3',
  ürünAdıFontBoyutu: '9',
  ürünKoduFontBoyutu: '9',
  altınAyarıFontBoyutu: '9',
  sagBölümHizalama: 'sol',
  sagBölümPadding: '0.3',
  müşteriBilgisiFontBoyutu: '9',
  bilgiSatırAraligi: '0.4',
  sayfaGenislik: '15',
  sayfaYukseklik: '11',
  genelPadding: '0.5',
  // Pozisyon ayarları (cm) - mevcut düzene göre ayarlanmış
  fotoğrafX: '0.8',
  fotoğrafY: '0.5',
  ürünAdıX: '0.8',
  ürünAdıY: '4.5',
  ürünKoduX: '0.8',
  ürünKoduY: '5.2',
  altınAyarıX: '0.8',
  altınAyarıY: '5.9',
  müşteriAdıX: '8.3',
  müşteriAdıY: '0.8',
  siparişTarihiX: '8.3',
  siparişTarihiY: '1.6',
  platformX: '8.3',
  platformY: '2.4',
  siparişNoX: '8.3',
  siparişNoY: '3.2',
};

export function getSertifikaAyarlari(): SertifikaAyarlari {
  const kaydedilmisAyarlar = localStorage.getItem('sertifikaAyarlari');
  if (kaydedilmisAyarlar) {
    try {
      const parsed = JSON.parse(kaydedilmisAyarlar);
      return { ...varsayilanAyarlar, ...parsed };
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error);
    }
  }
  return varsayilanAyarlar;
}

