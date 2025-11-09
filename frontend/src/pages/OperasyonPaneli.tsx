import { useEffect, useState, useMemo } from 'react';
import { siparisAPI, fotoğrafAPI } from '../services/api';
import { Siparis } from '../types';
import { CheckCircle2, RefreshCw, Image, Package, User, ShoppingBag, Search, Filter, X, FileText, Edit2, RotateCw, CheckCircle, AlertCircle, Info, Plus, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [notModal, setNotModal] = useState<{
    isOpen: boolean;
    siparisId: number | null;
    not: string;
  }>({ isOpen: false, siparisId: null, not: '' });
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ isOpen: false, message: '', type: 'info' });
  const [yeniSiparisModal, setYeniSiparisModal] = useState(false);
  const [yeniSiparisForm, setYeniSiparisForm] = useState({
    musteri_adi: '',
    musteri_telefon: '',
    musteri_adres: '',
    urun_adi: '',
    urun_kodu: '',
    miktar: 1,
    fiyat: 0,
    platform: 'Trendyol' as 'Trendyol' | 'Ikas',
  });
  const [filtreAcik, setFiltreAcik] = useState(false);

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
    platform: '',
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
    if (filtreler.platform) {
      filtered = filtered.filter(s =>
        s.platform === filtreler.platform
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

  const handleNotClick = (siparis: Siparis) => {
    setNotModal({ isOpen: true, siparisId: siparis.id, not: siparis.not || '' });
  };

  const handleNotSave = async () => {
    if (!notModal.siparisId) return;
    
    setUpdating(notModal.siparisId);
    
    try {
      await siparisAPI.updateNot(notModal.siparisId, notModal.not);
      await loadSiparisler();
      setNotModal({ isOpen: false, siparisId: null, not: '' });
    } catch (error) {
      console.error('Not güncellenemedi:', error);
      alert('Not güncellenirken hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => {
      setToast({ isOpen: false, message: '', type: 'info' });
    }, 3000);
  };

  const handleYeniSiparisKaydet = async () => {
    if (!yeniSiparisForm.musteri_adi || !yeniSiparisForm.urun_adi) {
      showToast('Müşteri adı ve ürün adı zorunludur', 'error');
      return;
    }

    try {
      const siparisNo = `MAN-${Date.now()}`;
      await siparisAPI.create({
        trendyol_siparis_no: siparisNo,
        siparis_tarihi: new Date().toISOString(),
        musteri_adi: yeniSiparisForm.musteri_adi,
        musteri_telefon: yeniSiparisForm.musteri_telefon || undefined,
        musteri_adres: yeniSiparisForm.musteri_adres || undefined,
        urun_adi: yeniSiparisForm.urun_adi,
        urun_kodu: yeniSiparisForm.urun_kodu || undefined,
        miktar: yeniSiparisForm.miktar,
        fiyat: yeniSiparisForm.fiyat,
        durum: 'Yeni',
        platform: yeniSiparisForm.platform,
      });
      
      await loadSiparisler();
      setYeniSiparisModal(false);
      setYeniSiparisForm({
        musteri_adi: '',
        musteri_telefon: '',
        musteri_adres: '',
        urun_adi: '',
        urun_kodu: '',
        miktar: 1,
        fiyat: 0,
        platform: 'Trendyol',
      });
      showToast('✅ Sipariş başarıyla eklendi!', 'success');
    } catch (error: any) {
      console.error('Sipariş ekleme hatası:', error);
      showToast('❌ Sipariş eklenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
  };

  const handleRefreshFoto = async (siparis: Siparis) => {
    if (!siparis.urun_kodu) {
      showToast('Ürün kodu bulunamadı', 'error');
      return;
    }
    
    setUpdating(siparis.id);
    
    try {
      const result = await fotoğrafAPI.refreshFotograf(siparis.id);
      if (result.success) {
        await loadSiparisler();
        showToast('✅ Fotoğraf başarıyla güncellendi!', 'success');
      } else {
        showToast(`⚠️ Fotoğraf bulunamadı: ${result.message || 'Supabase\'de fotoğraf yok'}`, 'error');
      }
    } catch (error: any) {
      console.error('Fotoğraf yenileme hatası:', error);
      showToast('❌ Fotoğraf yenilenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'error');
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 sm:gap-3 mb-2 sm:mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto]">
                  Yeni Sipariş
                </h2>
                <p className="text-slate-600 mt-0.5 sm:mt-1 font-medium text-xs sm:text-sm">Yeni gelen siparişleri yönetin</p>
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={() => setYeniSiparisModal(true)}
                  className="flex items-center justify-center px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold text-sm shadow-md touch-manipulation"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Sipariş
                </button>
              <button
                onClick={loadSiparisler}
                className="flex items-center justify-center px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold text-sm shadow-md touch-manipulation"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Yenile
              </button>
              </div>
            </div>

      {/* Filtre ve Sıralama */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200/60 mb-2 sm:mb-4 overflow-hidden">
        <button
          onClick={() => setFiltreAcik(!filtreAcik)}
          className="w-full flex items-center justify-between p-2 sm:p-3 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Filtre ve Sıralama</h3>
            {(filtreler.musteri || filtreler.urun || filtreler.platform) && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                {[filtreler.musteri, filtreler.urun, filtreler.platform].filter(Boolean).length}
              </span>
            )}
        </div>
          {filtreAcik ? (
            <ChevronUp className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-600" />
          )}
        </button>
        {filtreAcik && (
          <div className="px-2 sm:px-3 pb-2 sm:pb-3 border-t border-slate-200/60">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-3 pt-2 sm:pt-3">
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
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
              <Package className="w-3 h-3 text-blue-600" />
              Platform
            </label>
            <select
              value={filtreler.platform}
              onChange={(e) => setFiltreler({ ...filtreler, platform: e.target.value })}
              className="w-full px-3 py-2 text-xs border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700 shadow-sm hover:border-blue-300 touch-manipulation"
            >
              <option value="">Tüm Platformlar</option>
              <option value="Trendyol">Trendyol</option>
              <option value="Ikas">Ikas</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-2 sm:pt-2.5 border-t border-slate-200/60">
          <div className="flex items-center gap-1 sm:gap-1.5">
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
              {(filtreler.musteri || filtreler.urun || filtreler.platform) && (
            <button
                  onClick={() => setFiltreler({ musteri: '', urun: '', platform: '' })}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all font-semibold border-2 border-red-200 hover:border-red-300 shadow-sm touch-manipulation active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              Filtreleri Temizle
            </button>
          )}
        </div>
          </div>
        )}
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
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 overflow-hidden -mx-2 sm:mx-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/40" style={{ minWidth: '1000px' }}>
            <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200/60">
              <tr>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-blue-600" />
                    <span>Fotoğraf</span>
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span className="hidden md:inline">Müşteri</span>
                    <span className="md:hidden">Müş.</span>
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span>Ürün</span>
                  </div>
                </th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider hidden sm:table-cell">Ürün Kodu</th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredSiparisler.map((siparis) => (
                <tr key={siparis.id} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 group active:bg-blue-100/50">
                  <td className="px-2 sm:px-4 py-1.5 sm:py-3 whitespace-nowrap">
                    <div className="relative">
                    {getImageUrl(siparis.urun_resmi) ? (
                        <div className="relative w-[100px] h-[100px] sm:w-[173px] sm:h-[173px] overflow-hidden rounded-lg border-2 border-slate-200 shadow-md hover:border-blue-300 transition-all duration-200 bg-gradient-to-br from-slate-50 to-slate-100 group">
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
                            console.error(`❌ Fotoğraf yüklenemedi: ${siparis.urun_resmi}`, e);
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                          onLoad={() => {
                            console.log(`✅ Fotoğraf yüklendi: ${siparis.urun_resmi}`);
                          }}
                        />
                          <button
                            onClick={() => handleRefreshFoto(siparis)}
                            disabled={updating === siparis.id || !siparis.urun_kodu}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Fotoğrafı yenile"
                          >
                            {updating === siparis.id ? (
                              <RotateCw className="w-4 h-4 text-blue-600 animate-spin" />
                            ) : (
                              <RotateCw className="w-4 h-4 text-blue-600" />
                            )}
                          </button>
                      </div>
                    ) : (
                        <div className="relative w-[100px] h-[100px] sm:w-[173px] sm:h-[173px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex flex-col items-center justify-center text-xs text-slate-400 border-2 border-slate-200 shadow-sm">
                          <div className="mb-2">{siparis.urun_resmi ? 'Geçersiz URL' : 'Resim Yok'}</div>
                          {siparis.urun_kodu && (
                            <button
                              onClick={() => handleRefreshFoto(siparis)}
                              disabled={updating === siparis.id}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                              title="Supabase'den fotoğraf çek"
                            >
                              {updating === siparis.id ? (
                                <>
                                  <RotateCw className="w-3 h-3 animate-spin" />
                                  <span>Yükleniyor...</span>
                                </>
                              ) : (
                                <>
                                  <RotateCw className="w-3 h-3" />
                                  <span>Fotoğraf Çek</span>
                                </>
                              )}
                            </button>
                          )}
                      </div>
                    )}
                    </div>
                  </td>
                  <td className="px-1.5 sm:px-4 py-1 sm:py-2 whitespace-nowrap">
                    <div className="space-y-0.5 sm:space-y-1">
                      <div className="text-xs sm:text-sm text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors">
                        {siparis.musteri_adi}
                      </div>
                      <div className="text-xs text-slate-500 font-mono leading-tight bg-slate-50 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md inline-block border border-slate-200">
                        {siparis.trendyol_siparis_no}
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 mt-1 leading-tight">
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
                  <td className="px-1.5 sm:px-4 py-1 sm:py-2">
                    <div className="flex-1 min-w-0">
                      {(() => {
                        const { satir1, satir2 } = formatUrunAdi(siparis.urun_adi);
                        return (
                          <div className="space-y-0.5 sm:space-y-2">
                            <div className="space-y-0.5 sm:space-y-1">
                              <div className="text-xs sm:text-sm text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">
                                {satir1}
                              </div>
                              {satir2 && (
                                <div className="text-xs text-slate-600 leading-tight flex items-center gap-1.5 line-clamp-1">
                                  <span className="text-blue-600 font-bold">•</span>
                                  {satir2}
                                </div>
                              )}
                            </div>
                            {siparis.not && (
                              <div className="mt-0.5 sm:mt-2 p-1.5 sm:p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg sm:rounded-xl shadow-sm">
                                <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed font-medium line-clamp-2 sm:line-clamp-none">
                                  {siparis.not}
                                </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                  </td>
                  <td className="px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-sm font-bold text-blue-600 bg-blue-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-blue-200">
                        {siparis.urun_kodu || '-'}
                      </span>
                      <span className={`px-2 sm:px-2.5 py-1 sm:py-1.5 text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-sm min-w-[35px] sm:min-w-[40px] text-center ${
                        siparis.miktar > 1 
                          ? 'bg-gradient-to-br from-red-500 to-rose-600 border border-red-400/30' 
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/30'
                      }`}>
                        ×{siparis.miktar}
                      </span>
                    </div>
                  </td>
                  <td className="px-1.5 sm:px-4 py-1 sm:py-2 whitespace-nowrap">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0.5 sm:gap-2">
                      <button
                        onClick={() => handleNotClick(siparis)}
                        disabled={updating === siparis.id}
                        className={`flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] rounded-lg hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-xs sm:text-sm font-semibold shadow-sm touch-manipulation ${
                          siparis.not
                            ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                        title={siparis.not || 'Not ekle'}
                      >
                        {siparis.not ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <Edit2 className="w-4 h-4" />
                        )}
                      </button>
                    <button
                      onClick={() => handleUretimeGonderClick(siparis.id)}
                      disabled={updating === siparis.id}
                        className="flex items-center justify-center px-3 sm:px-5 py-2 sm:py-3 min-h-[36px] sm:min-h-[40px] bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-xs sm:text-sm font-bold shadow-md touch-manipulation"
                    >
                      {updating === siparis.id ? (
                        <>
                            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                            <span className="hidden sm:inline">Gönderiliyor...</span>
                            <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Üretime Gönder</span>
                            <span className="sm:hidden">Gönder</span>
                        </>
                      )}
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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

      {/* Not Modal */}
      {notModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Sipariş Notu
              </h3>
              <button
                onClick={() => setNotModal({ isOpen: false, siparisId: null, not: '' })}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={notModal.not}
              onChange={(e) => setNotModal({ ...notModal, not: e.target.value })}
              placeholder="Sipariş için not ekleyin..."
              className="w-full h-32 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-slate-700"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setNotModal({ isOpen: false, siparisId: null, not: '' })}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleNotSave}
                disabled={updating === notModal.siparisId}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updating === notModal.siparisId ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  'Kaydet'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Sipariş Modal */}
      {yeniSiparisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Yeni Sipariş Ekle
              </h3>
              <button
                onClick={() => setYeniSiparisModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Müşteri Adı *</label>
                  <input
                    type="text"
                    value={yeniSiparisForm.musteri_adi}
                    onChange={(e) => setYeniSiparisForm({ ...yeniSiparisForm, musteri_adi: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                    placeholder="Müşteri adı..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Müşteri Telefon</label>
                  <input
                    type="text"
                    value={yeniSiparisForm.musteri_telefon}
                    onChange={(e) => setYeniSiparisForm({ ...yeniSiparisForm, musteri_telefon: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                    placeholder="Telefon numarası..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Müşteri Adres</label>
                  <textarea
                    value={yeniSiparisForm.musteri_adres}
                    onChange={(e) => setYeniSiparisForm({ ...yeniSiparisForm, musteri_adres: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700 resize-none"
                    rows={2}
                    placeholder="Adres..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ürün Adı *</label>
                  <input
                    type="text"
                    value={yeniSiparisForm.urun_adi}
                    onChange={(e) => setYeniSiparisForm({ ...yeniSiparisForm, urun_adi: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                    placeholder="Ürün adı..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ürün Kodu</label>
                  <input
                    type="text"
                    value={yeniSiparisForm.urun_kodu}
                    onChange={(e) => setYeniSiparisForm({ ...yeniSiparisForm, urun_kodu: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                    placeholder="Ürün kodu..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Miktar</label>
                  <input
                    type="number"
                    min="1"
                    value={yeniSiparisForm.miktar}
                    onChange={(e) => setYeniSiparisForm({ ...yeniSiparisForm, miktar: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fiyat (₺)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={yeniSiparisForm.fiyat}
                    onChange={(e) => setYeniSiparisForm({ ...yeniSiparisForm, fiyat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Platform</label>
                  <select
                    value={yeniSiparisForm.platform}
                    onChange={(e) => setYeniSiparisForm({ ...yeniSiparisForm, platform: e.target.value as 'Trendyol' | 'Ikas' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700"
                  >
                    <option value="Trendyol">Trendyol</option>
                    <option value="Ikas">Ikas</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setYeniSiparisModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleYeniSiparisKaydet}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Sipariş Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.isOpen && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto z-50 animate-slide-in-right ${
          toast.type === 'success' ? 'bg-green-500' : 
          toast.type === 'error' ? 'bg-red-500' : 
          'bg-blue-500'
        } text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-2xl flex items-center gap-2 sm:gap-3 min-w-[280px] sm:min-w-[300px] max-w-md`}>
          <div className="flex-shrink-0">
            {toast.type === 'success' ? (
              <CheckCircle className="w-6 h-6" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-6 h-6" />
            ) : (
              <Info className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 font-medium text-sm">{toast.message}</div>
          <button
            onClick={() => setToast({ isOpen: false, message: '', type: 'info' })}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default OperasyonPaneli;
