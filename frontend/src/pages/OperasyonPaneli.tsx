import { useEffect, useState, useMemo } from 'react';
import { siparisAPI } from '../services/api';
import { Siparis } from '../types';
import { CheckCircle2, RefreshCw, Image, Package, User, ShoppingBag, Search, Filter, X } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { getImageUrl } from '../utils/imageHelper';

function OperasyonPaneli() {
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: number | null;
  }>({ isOpen: false, id: null });

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
      const data = await siparisAPI.getAll('Yeni');
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

  const handleUretimeGonderClick = (id: number) => {
    setConfirmModal({ isOpen: true, id });
  };

  const handleUretimeGonder = async () => {
    if (!confirmModal.id) return;
    
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    setUpdating(id);
    
    try {
      await siparisAPI.updateDurum(id, 'Üretimde');
      setSiparisler(siparisler.filter(s => s.id !== id));
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
      alert('Durum güncellenirken hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto]">
                  Yeni Sipariş
                </h2>
                <p className="text-slate-600 mt-1 font-medium text-sm">Yeni gelen siparişleri yönetin</p>
              </div>
              <button
                onClick={loadSiparisler}
                className="flex items-center justify-center px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold text-sm shadow-md touch-manipulation"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Yenile
              </button>
            </div>

      {/* Filtre ve Sıralama */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 backdrop-blur-sm p-4 rounded-lg shadow-xl border-2 border-blue-100/60 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Filtre ve Sıralama</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
              <User className="w-3 h-3 text-blue-600" />
              Müşteri Ara
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={filtreler.musteri}
                onChange={(e) => setFiltreler({ ...filtreler, musteri: e.target.value })}
                placeholder="Müşteri adı..."
                className="w-full pl-9 pr-3 py-2 text-xs border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700 placeholder-slate-400 shadow-sm hover:border-blue-300 touch-manipulation"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
              <ShoppingBag className="w-3 h-3 text-blue-600" />
              Ürün Ara
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={filtreler.urun}
                onChange={(e) => setFiltreler({ ...filtreler, urun: e.target.value })}
                placeholder="Ürün adı..."
                className="w-full pl-9 pr-3 py-2 text-xs border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700 placeholder-slate-400 shadow-sm hover:border-blue-300 touch-manipulation"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-200/60">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-blue-600" />
              Sırala:
            </label>
            <select
              value={siralama.alan}
              onChange={(e) => setSiralama({ ...siralama, alan: e.target.value as any })}
              className="px-3 py-2 text-xs border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700 font-semibold shadow-sm hover:border-blue-300 touch-manipulation min-h-[36px]"
            >
              <option value="siparis_tarihi">Tarih</option>
              <option value="musteri_adi">Müşteri</option>
              <option value="urun_adi">Ürün</option>
              <option value="trendyol_siparis_no">Sipariş No</option>
            </select>
            <button
              onClick={() => setSiralama({ ...siralama, yon: siralama.yon === 'asc' ? 'desc' : 'asc' })}
              className="px-3 py-2 min-h-[36px] min-w-[40px] border-2 border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 active:scale-95 transition-all font-bold text-sm text-slate-700 shadow-sm touch-manipulation bg-white"
            >
              {siralama.yon === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-200">
            <Package className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-slate-700 font-bold">
              {filteredSiparisler.length} / {siparisler.length} sipariş
            </span>
          </div>
          {(filtreler.musteri || filtreler.urun) && (
            <button
              onClick={() => setFiltreler({ musteri: '', urun: '' })}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all font-semibold border-2 border-red-200 hover:border-red-300 shadow-sm touch-manipulation active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {siparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-3 bg-slate-100 rounded-full w-13 h-13 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium text-sm">Yeni sipariş bulunamadı</p>
        </div>
      ) : filteredSiparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-3 bg-slate-100 rounded-full w-13 h-13 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium text-sm">Filtrelere uygun sipariş bulunamadı</p>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200/40">
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
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">İşlem</th>
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
                            console.error(`❌ Fotoğraf yüklenemedi: ${siparis.urun_resmi}`, e);
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                          onLoad={() => {
                            console.log(`✅ Fotoğraf yüklendi: ${siparis.urun_resmi}`);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-[173px] h-[173px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 border-2 border-slate-200 shadow-sm">
                        {siparis.urun_resmi ? 'Geçersiz URL' : 'Resim Yok'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors">
                        {siparis.musteri_adi}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 font-mono leading-tight bg-slate-50 px-2.5 py-1 rounded-md inline-block border border-slate-200">
                        {siparis.trendyol_siparis_no}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 leading-tight">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const { satir1, satir2 } = formatUrunAdi(siparis.urun_adi);
                          return (
                            <div className="space-y-1">
                              <div className="text-sm text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors">
                                {satir1}
                              </div>
                              {satir2 && (
                                <div className="text-xs text-slate-600 leading-tight flex items-center gap-1.5">
                                  <span className="text-blue-600 font-bold">•</span>
                                  {satir2}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <span className={`px-2.5 py-1 text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-sm flex-shrink-0 min-w-[40px] text-center ${
                        siparis.miktar > 1 
                          ? 'bg-gradient-to-br from-red-500 to-rose-600 border border-red-400/30' 
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/30'
                      }`}>
                        ×{siparis.miktar}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleUretimeGonderClick(siparis.id)}
                      disabled={updating === siparis.id}
                      className="flex items-center justify-center px-5 py-3 min-h-[40px] bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm font-bold shadow-md touch-manipulation"
                    >
                      {updating === siparis.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          <span>Gönderiliyor...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          <span>Üretime Gönder</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Onay Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Üretime Gönder"
        message="Bu siparişi üretime göndermek istediğinize emin misiniz?"
        onConfirm={handleUretimeGonder}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        confirmText="Onayla"
        cancelText="İptal"
        confirmColor="green"
      />
    </div>
  );
}

export default OperasyonPaneli;
