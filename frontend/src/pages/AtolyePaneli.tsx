import { useEffect, useState, useMemo } from 'react';
import { siparisAPI } from '../services/api';
import { Siparis, UretimDurum } from '../types';
import { RefreshCw, CheckCircle2, ArrowRight, Sparkles, Wrench, ChevronDown, ChevronUp, Package, Image, User, ShoppingBag } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { getImageUrl } from '../utils/imageHelper';

function AtolyePaneli() {
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [selectedUretimDurum, setSelectedUretimDurum] = useState<UretimDurum | 'Tümü'>('Tümü');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: number | null;
    uretimDurum: UretimDurum | null;
  }>({ isOpen: false, id: null, uretimDurum: null });
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

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
    alan: 'musteri_adi' | 'urun_adi' | 'trendyol_siparis_no';
    yon: 'asc' | 'desc';
  }>({
    alan: 'musteri_adi',
    yon: 'asc',
  });

  useEffect(() => {
    loadSiparisler();
    const interval = setInterval(loadSiparisler, 120000); // 2 dakikada bir güncelle
    return () => clearInterval(interval);
  }, []);

  const loadSiparisler = async () => {
    try {
      const data = await siparisAPI.getAll('Üretimde');
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

    // Üretim durumu filtresi
    if (selectedUretimDurum !== 'Tümü') {
      filtered = filtered.filter(s => {
        const durum = s.uretim_durumu || 'Döküme Gönderilecek';
        return durum === selectedUretimDurum || 
               (!s.uretim_durumu && selectedUretimDurum === 'Döküme Gönderilecek');
      });
    }

    // Müşteri filtresi
    if (filtreler.musteri) {
      const musteriLower = filtreler.musteri.toLowerCase();
      filtered = filtered.filter(s =>
        s.musteri_adi.toLowerCase().includes(musteriLower)
      );
    }
    
    // Ürün filtresi
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
  }, [siparisler, filtreler, siralama, selectedUretimDurum]);

  const handleUretimDurumGuncelleClick = (id: number, uretimDurum: UretimDurum) => {
    setConfirmModal({ isOpen: true, id, uretimDurum });
  };

  const handleUretimDurumGuncelle = async () => {
    if (!confirmModal.id || !confirmModal.uretimDurum) return;
    
    const id = confirmModal.id;
    const uretimDurum = confirmModal.uretimDurum;
    setConfirmModal({ isOpen: false, id: null, uretimDurum: null });
    setUpdating(id);
    
    try {
      // Üretim durumunu güncelle
      await siparisAPI.updateUretimDurum(id, uretimDurum);
      
      // Eğer "Tamamlandı" ise, ana durumu "Sertifika" olarak güncelle
      if (uretimDurum === 'Tamamlandı') {
        await siparisAPI.updateDurum(id, 'Sertifika');
      }
      
      // Listeyi yenile (sipariş artık "Üretimde" durumunda olmayabilir)
      await loadSiparisler();
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
      alert('Durum güncellenirken hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  const getModalTitle = (uretimDurum: UretimDurum) => {
    switch (uretimDurum) {
      case 'Döküme Gönderilecek':
        return 'Döküme Gönder';
      case 'Dökümde':
        return 'Dökümde Durumuna Geçir';
      case 'Atölye':
        return 'Atölye Durumuna Geçir';
      case 'Tamamlandı':
        return 'Tamamlandı';
      default:
        return 'Durum Güncelle';
    }
  };

  const getModalMessage = (uretimDurum: UretimDurum) => {
    switch (uretimDurum) {
      case 'Döküme Gönderilecek':
        return 'Bu siparişi döküme gönderilecek durumuna geçirmek istediğinize emin misiniz?';
      case 'Dökümde':
        return 'Bu siparişi dökümde durumuna geçirmek istediğinize emin misiniz?';
      case 'Atölye':
        return 'Bu siparişi atölye durumuna geçirmek istediğinize emin misiniz?';
      case 'Tamamlandı':
        return 'Bu siparişi tamamlandı durumuna geçirmek istediğinize emin misiniz?';
      default:
        return 'Bu işlemi yapmak istediğinize emin misiniz?';
    }
  };

  const getConfirmColor = (uretimDurum: UretimDurum): 'blue' | 'green' | 'red' | 'orange' | 'purple' => {
    switch (uretimDurum) {
      case 'Döküme Gönderilecek':
        return 'blue';
      case 'Dökümde':
        return 'purple';
      case 'Atölye':
        return 'orange';
      case 'Tamamlandı':
        return 'green';
      default:
        return 'blue';
    }
  };

  // Sonraki adımı belirle
  const getNextStep = (currentStatus: UretimDurum): UretimDurum | null => {
    switch (currentStatus) {
      case 'Döküme Gönderilecek':
        return 'Dökümde';
      case 'Dökümde':
        return 'Atölye';
      case 'Atölye':
        return 'Tamamlandı';
      case 'Tamamlandı':
        return null; // Zaten son adım
      default:
        return 'Dökümde';
    }
  };

  // Önceki adımları belirle (geriye dönüş için)
  const getPreviousSteps = (currentStatus: UretimDurum): UretimDurum[] => {
    const allSteps: UretimDurum[] = ['Döküme Gönderilecek', 'Dökümde', 'Atölye', 'Tamamlandı'];
    const currentIndex = allSteps.indexOf(currentStatus);
    return allSteps.slice(0, currentIndex);
  };

  const uretimDurumRenkleri: Record<UretimDurum, string> = {
    'Döküme Gönderilecek': 'bg-blue-100 text-blue-800 border-blue-200',
    'Dökümde': 'bg-purple-100 text-purple-800 border-purple-200',
    'Atölye': 'bg-orange-100 text-orange-800 border-orange-200',
    'Tamamlandı': 'bg-green-100 text-green-800 border-green-200',
  };

  const uretimDurumIkonlari: Record<UretimDurum, any> = {
    'Döküme Gönderilecek': ArrowRight,
    'Dökümde': Sparkles,
    'Atölye': Wrench,
    'Tamamlandı': CheckCircle2,
  };

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
            Atölye
          </h2>
          <p className="text-slate-600 mt-1 font-medium">Üretim süreçlerini yönetin</p>
        </div>
        <button
          onClick={loadSiparisler}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenile
        </button>
      </div>

      {/* Üretim Durumu Filtreleri */}
      <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl shadow-lg border border-slate-200/60 mb-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedUretimDurum('Tümü')}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              selectedUretimDurum === 'Tümü'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Tümü
          </button>
          {(['Döküme Gönderilecek', 'Dökümde', 'Atölye', 'Tamamlandı'] as UretimDurum[]).map((durum) => {
            const Ikoni = uretimDurumIkonlari[durum];
            const renk = uretimDurumRenkleri[durum];
            return (
              <button
                key={durum}
                onClick={() => setSelectedUretimDurum(durum)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                  selectedUretimDurum === durum
                    ? `${renk} border-2 shadow-md`
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Ikoni className="w-4 h-4" />
                {durum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtre ve Sıralama */}
      <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl shadow-lg border border-slate-200/60 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Müşteri Ara
            </label>
            <input
              type="text"
              value={filtreler.musteri}
              onChange={(e) => setFiltreler({ ...filtreler, musteri: e.target.value })}
              placeholder="Müşteri adı..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 text-slate-700 placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Ürün Ara
            </label>
            <input
              type="text"
              value={filtreler.urun}
              onChange={(e) => setFiltreler({ ...filtreler, urun: e.target.value })}
              placeholder="Ürün adı..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Sırala:</label>
            <select
              value={siralama.alan}
              onChange={(e) => setSiralama({ ...siralama, alan: e.target.value as any })}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 text-slate-700 font-medium"
            >
              <option value="musteri_adi">Müşteri</option>
              <option value="urun_adi">Ürün</option>
              <option value="trendyol_siparis_no">Sipariş No</option>
            </select>
            <button
              onClick={() => setSiralama({ ...siralama, yon: siralama.yon === 'asc' ? 'desc' : 'asc' })}
              className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
            >
              {siralama.yon === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div className="text-sm text-slate-600 font-medium">
            {filteredSiparisler.length} / {siparisler.length} sipariş
          </div>
          {(filtreler.musteri || filtreler.urun || selectedUretimDurum !== 'Tümü') && (
            <button
              onClick={() => {
                setFiltreler({ musteri: '', urun: '' });
                setSelectedUretimDurum('Tümü');
              }}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {siparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-4 bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Üretimde sipariş bulunamadı</p>
        </div>
      ) : filteredSiparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-4 bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Filtrelere uygun sipariş bulunamadı</p>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200/40">
            <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200/60">
              <tr>
                <th className="px-5 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-blue-600" />
                    <span>Fotoğraf</span>
                  </div>
                </th>
                <th className="px-5 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span>Müşteri</span>
                  </div>
                </th>
                <th className="px-5 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                    <span>Ürün</span>
                  </div>
                </th>
                <th className="px-5 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Ürün Kodu</th>
                <th className="px-5 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Üretim Durumu</th>
                <th className="px-5 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredSiparisler.map((siparis) => {
                const mevcutUretimDurum = siparis.uretim_durumu || 'Döküme Gönderilecek';
                const DurumIkoni = uretimDurumIkonlari[mevcutUretimDurum as UretimDurum] || ArrowRight;
                const durumRenk = uretimDurumRenkleri[mevcutUretimDurum as UretimDurum] || 'bg-slate-100 text-slate-800 border-slate-200';
                
                return (
                  <tr key={siparis.id} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 group active:bg-blue-100/50">
                    <td className="px-5 py-4 whitespace-nowrap">
                      {getImageUrl(siparis.urun_resmi) ? (
                        <div className="relative w-[216px] h-[216px] overflow-hidden rounded-xl border-2 border-slate-200 shadow-md hover:border-blue-300 transition-all duration-200 bg-gradient-to-br from-slate-50 to-slate-100">
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
                        <div className="w-[216px] h-[216px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-sm text-slate-400 border-2 border-slate-200 shadow-sm">
                          Resim Yok
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <div className="text-base text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors">
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
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const { satir1, satir2 } = formatUrunAdi(siparis.urun_adi);
                          return (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <div className="text-base text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors">
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
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                          {siparis.urun_kodu || '-'}
                        </span>
                        <span className={`px-3 py-2 text-white text-sm font-bold rounded-lg whitespace-nowrap shadow-sm border min-w-[50px] text-center ${
                          siparis.miktar > 1 
                            ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-400/30' 
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/30'
                        }`}>
                          ×{siparis.miktar}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg border-2 flex items-center gap-1.5 w-fit ${durumRenk}`}>
                        <DurumIkoni className="w-4 h-4" />
                        {mevcutUretimDurum}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {/* Sonraki Adım Butonu */}
                        {(() => {
                          const nextStep = getNextStep(mevcutUretimDurum as UretimDurum);
                          if (!nextStep) return null;
                          
                          const nextStepColor = getConfirmColor(nextStep);
                          
                          return (
                            <button
                              onClick={() => handleUretimDurumGuncelleClick(siparis.id, nextStep)}
                              disabled={updating === siparis.id}
                              className={`inline-flex items-center justify-center px-4 py-2.5 min-h-[40px] text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all touch-manipulation ${
                                nextStepColor === 'blue' ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                                nextStepColor === 'purple' ? 'bg-gradient-to-r from-purple-600 to-purple-700' :
                                nextStepColor === 'orange' ? 'bg-orange-600' :
                                nextStepColor === 'green' ? 'bg-green-600' : 'bg-gray-600'
                              }`}
                            >
                              {updating === siparis.id ? (
                                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                              ) : (
                                <ArrowRight className="w-5 h-5 mr-2" />
                              )}
                              {nextStep}
                            </button>
                          );
                        })()}

                        {/* Geriye Dönüş Dropdown (sadece önceki adımlar varsa) */}
                        {(() => {
                          const previousSteps = getPreviousSteps(mevcutUretimDurum as UretimDurum);
                          if (previousSteps.length === 0) return null;
                          
                          return (
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdownId(openDropdownId === siparis.id ? null : siparis.id)}
                                className="inline-flex items-center justify-center px-3 py-2.5 min-h-[40px] min-w-[40px] border-2 border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:border-blue-400 active:scale-95 transition-all shadow-sm touch-manipulation"
                              >
                                {openDropdownId === siparis.id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              
                              {openDropdownId === siparis.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                  <div className="py-1">
                                    {previousSteps.map((step) => {
                                      const StepIcon = uretimDurumIkonlari[step];
                                      return (
                                        <button
                                          key={step}
                                          onClick={() => {
                                            handleUretimDurumGuncelleClick(siparis.id, step);
                                            setOpenDropdownId(null);
                                          }}
                                          className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 min-h-[40px] flex items-center gap-2 touch-manipulation"
                                        >
                                          <StepIcon className="w-4 h-4" />
                                          {step}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Onay Modal */}
      {confirmModal.uretimDurum && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={getModalTitle(confirmModal.uretimDurum)}
          message={getModalMessage(confirmModal.uretimDurum)}
          onConfirm={handleUretimDurumGuncelle}
          onCancel={() => setConfirmModal({ isOpen: false, id: null, uretimDurum: null })}
          confirmText="Onayla"
          cancelText="İptal"
          confirmColor={getConfirmColor(confirmModal.uretimDurum)}
        />
      )}

      {/* Dropdown dışına tıklanınca kapat */}
      {openDropdownId !== null && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setOpenDropdownId(null)}
        />
      )}
    </div>
  );
}

export default AtolyePaneli;
