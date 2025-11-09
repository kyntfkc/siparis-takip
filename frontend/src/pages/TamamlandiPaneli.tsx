import { useEffect, useState, useMemo } from 'react';
import { siparisAPI } from '../services/api';
import { Siparis } from '../types';
import { RefreshCw, CheckCircle, Image, User, ShoppingBag } from 'lucide-react';
import { getImageUrl } from '../utils/imageHelper';

function TamamlandiPaneli() {
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [loading, setLoading] = useState(true);

  // Ürün adını 2 satıra ayırma fonksiyonu
  const formatUrunAdi = (urunAdi: string): { satir1: string; satir2: string } => {
    // "one size" kısmını kaldır
    let cleaned = urunAdi.replace(/,\s*one\s*size/gi, '').trim();
    
    // "14 Ayar Altın" pattern'ini bul
    const altinPattern = /(\d+\s*Ayar\s*Altın)/i;
    const match = cleaned.match(altinPattern);
    
    if (match && match.index !== undefined) {
      const satir1 = cleaned.substring(0, match.index).trim();
      const satir2 = cleaned.substring(match.index).trim();
      return { satir1, satir2 };
    }
    
    // Pattern bulunamazsa, ilk kelimeleri satır1, kalanı satır2 yap
    const words = cleaned.split(' ');
    if (words.length > 3) {
      const satir1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
      const satir2 = words.slice(Math.ceil(words.length / 2)).join(' ');
      return { satir1, satir2 };
    }
    
    return { satir1: cleaned, satir2: '' };
  };
  
  // Filtre ve sıralama state'leri
  const [filtreler, setFiltreler] = useState({
    musteri: '',
    urun: '',
    tarihBaslangic: '',
    tarihBitis: '',
  });
  const [siralama, setSiralama] = useState<{
    alan: 'siparis_tarihi' | 'musteri_adi' | 'urun_adi' | 'trendyol_siparis_no';
    yon: 'asc' | 'desc';
  }>({
    alan: 'siparis_tarihi',
    yon: 'asc',
  });

  useEffect(() => {
    loadSiparisler();
    const interval = setInterval(loadSiparisler, 120000); // 2 dakikada bir güncelle
    return () => clearInterval(interval);
  }, []);

  const loadSiparisler = async () => {
    try {
      const data = await siparisAPI.getAll('Tamamlandı');
      setSiparisler(data);
    } catch (error) {
      console.error('Siparişler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtreleme ve sıralama (useMemo ile optimize edildi)
  const filteredSiparisler = useMemo(() => {
    let filtered = [...siparisler];

    // Filtreleme
    if (filtreler.musteri) {
      const musteriLower = filtreler.musteri.toLowerCase();
      filtered = filtered.filter(s =>
        s.musteri_adi.toLowerCase().includes(musteriLower)
      );
    }
    if (filtreler.urun) {
      const urunLower = filtreler.urun.toLowerCase();
      filtered = filtered.filter(s =>
        s.urun_adi.toLowerCase().includes(urunLower)
      );
    }
    if (filtreler.tarihBaslangic) {
      const baslangic = new Date(filtreler.tarihBaslangic);
      filtered = filtered.filter(s => {
        const tarih = typeof s.siparis_tarihi === 'string' 
          ? new Date(parseInt(s.siparis_tarihi)) 
          : new Date(s.siparis_tarihi);
        return tarih >= baslangic;
      });
    }
    if (filtreler.tarihBitis) {
      const bitis = new Date(filtreler.tarihBitis);
      bitis.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => {
        const tarih = typeof s.siparis_tarihi === 'string' 
          ? new Date(parseInt(s.siparis_tarihi)) 
          : new Date(s.siparis_tarihi);
        return tarih <= bitis;
      });
    }

    // Sıralama
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (siralama.alan) {
        case 'siparis_tarihi':
          aValue = typeof a.siparis_tarihi === 'string' 
            ? new Date(parseInt(a.siparis_tarihi)).getTime() 
            : new Date(a.siparis_tarihi).getTime();
          bValue = typeof b.siparis_tarihi === 'string' 
            ? new Date(parseInt(b.siparis_tarihi)).getTime() 
            : new Date(b.siparis_tarihi).getTime();
          break;
        case 'musteri_adi':
          aValue = a.musteri_adi.toLowerCase();
          bValue = b.musteri_adi.toLowerCase();
          break;
        case 'urun_adi':
          aValue = a.urun_adi.toLowerCase();
          bValue = b.urun_adi.toLowerCase();
          break;
        case 'trendyol_siparis_no':
          aValue = a.trendyol_siparis_no;
          bValue = b.trendyol_siparis_no;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return siralama.yon === 'asc' ? -1 : 1;
      if (aValue > bValue) return siralama.yon === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [siparisler, filtreler, siralama]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-slate-600 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto]">
            Tamamlandı
          </h2>
          <p className="text-slate-600 mt-1 font-medium">Tamamlanan siparişleri görüntüleyin</p>
        </div>
        <button
          onClick={loadSiparisler}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenile
        </button>
      </div>

      {/* Filtre ve Sıralama */}
      <div className="bg-white/80 backdrop-blur-sm p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg border border-slate-200/60 mb-3 sm:mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
              Müşteri Ara
            </label>
            <input
              type="text"
              value={filtreler.musteri}
              onChange={(e) => setFiltreler({ ...filtreler, musteri: e.target.value })}
              placeholder="Müşteri adı..."
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 text-slate-700 placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
              Ürün Ara
            </label>
            <input
              type="text"
              value={filtreler.urun}
              onChange={(e) => setFiltreler({ ...filtreler, urun: e.target.value })}
              placeholder="Ürün adı..."
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 text-slate-700 placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filtreler.tarihBaslangic}
              onChange={(e) => setFiltreler({ ...filtreler, tarihBaslangic: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 text-slate-700"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filtreler.tarihBitis}
              onChange={(e) => setFiltreler({ ...filtreler, tarihBitis: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 text-slate-700"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-xs sm:text-sm font-medium text-slate-700">Sırala:</label>
            <select
              value={siralama.alan}
              onChange={(e) => setSiralama({ ...siralama, alan: e.target.value as any })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 text-slate-700 font-medium"
            >
              <option value="siparis_tarihi">Tarih</option>
              <option value="musteri_adi">Müşteri</option>
              <option value="urun_adi">Ürün</option>
              <option value="trendyol_siparis_no">Sipariş No</option>
            </select>
            <button
              onClick={() => setSiralama({ ...siralama, yon: siralama.yon === 'asc' ? 'desc' : 'asc' })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg sm:rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
            >
              {siralama.yon === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 font-medium">
            {filteredSiparisler.length} / {siparisler.length} sipariş
          </div>
          {(filtreler.musteri || filtreler.urun || filtreler.tarihBaslangic || filtreler.tarihBitis) && (
            <button
              onClick={() => setFiltreler({ musteri: '', urun: '', tarihBaslangic: '', tarihBitis: '' })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg sm:rounded-xl transition-colors font-medium"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {siparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-4 bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Tamamlanan sipariş bulunamadı</p>
        </div>
      ) : filteredSiparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-4 bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Filtrelere uygun sipariş bulunamadı</p>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 overflow-hidden -mx-2 sm:mx-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/40" style={{ minWidth: '1000px' }}>
            <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-blue-600" />
                    <span>Fotoğraf</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Müşteri</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>Ürün</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Ürün Kodu</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Adres</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredSiparisler.map((siparis) => (
                <tr key={siparis.id} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 group active:bg-blue-100/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getImageUrl(siparis.urun_resmi) ? (
                      <div className="relative w-[173px] h-[173px] overflow-hidden rounded-lg border-2 border-slate-200 shadow-md hover:border-blue-300 transition-all duration-200 bg-gradient-to-br from-slate-50 to-slate-100">
                        <img 
                          src={getImageUrl(siparis.urun_resmi)!} 
                          alt={siparis.urun_adi}
                          loading="lazy"
                          crossOrigin="anonymous"
                          className="w-full h-full"
                          style={{ 
                            objectFit: 'cover',
                            imageRendering: '-webkit-optimize-contrast',
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(0) scale(1.2)',
                            willChange: 'transform',
                            WebkitBackfaceVisibility: 'hidden',
                            WebkitTransform: 'translateZ(0) scale(1.2)'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-[173px] h-[173px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 border-2 border-slate-200 shadow-sm">
                        Resim Yok
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="space-y-1.5">
                      <div className="text-sm text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors">
                        {siparis.musteri_adi}
                      </div>
                      {siparis.musteri_telefon && (
                        <div className="text-xs text-slate-500 leading-tight">
                          {siparis.musteri_telefon}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-0.5 font-mono leading-tight bg-slate-50 px-2 py-0.5 rounded-md inline-block border border-slate-200">
                        {siparis.trendyol_siparis_no}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-1 leading-tight">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {(() => {
                          const tarih = typeof siparis.siparis_tarihi === 'string' 
                            ? new Date(parseInt(siparis.siparis_tarihi)) 
                            : new Date(siparis.siparis_tarihi);
                          return isNaN(tarih.getTime()) ? 'Geçersiz Tarih' : tarih.toLocaleDateString('tr-TR');
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex-1 min-w-0">
                      {(() => {
                        const { satir1, satir2 } = formatUrunAdi(siparis.urun_adi);
                        return (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="text-sm text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors">
                                {satir1}
                              </div>
                              {satir2 && (
                                <div className="text-sm text-slate-600 leading-tight flex items-center gap-1.5">
                                  <span className="text-blue-600 font-bold">•</span>
                                  {satir2}
                                </div>
                              )}
                            </div>
                            {siparis.not && (
                              <div className="mt-2 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-sm">
                                <div className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed font-medium">
                                  {siparis.not}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                        {siparis.urun_kodu || '-'}
                      </span>
                      <span className={`px-3 py-1.5 text-white text-sm font-bold rounded-lg whitespace-nowrap shadow-sm border min-w-[50px] text-center ${
                        siparis.miktar > 1 
                          ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-400/30' 
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/30'
                      }`}>
                        ×{siparis.miktar}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 max-w-xs">
                    <div className="truncate">
                      {siparis.musteri_adres || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TamamlandiPaneli;

