export type SiparisDurum = 'Yeni' | 'Operasyon Onayı' | 'Üretimde' | 'Sertifika' | 'Yazdırıldı' | 'Tamamlandı' | 'İade/Hatalı';
export type UretimDurum = 'Döküme Gönderilecek' | 'Dökümde' | 'Atölye' | 'Tamamlandı';

export interface Siparis {
  id: number;
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
  durum: SiparisDurum;
  uretim_durumu?: UretimDurum;
  platform?: 'Trendyol' | 'Ikas';
  created_at?: string;
  updated_at?: string;
}
