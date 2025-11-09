import { useEffect, useState, useMemo, useCallback } from 'react';
import { siparisAPI, raporAPI } from '../services/api';
import { Siparis, SiparisDurum } from '../types';
import { RefreshCw, Filter, Package } from 'lucide-react';
import { format } from 'date-fns';

const durumRenkleri: Record<SiparisDurum, string> = {
  'Yeni': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Operasyon Onayı': 'bg-blue-100 text-blue-800 border-blue-200',
  'Üretimde': 'bg-purple-100 text-purple-800 border-purple-200',
  'Sertifika': 'bg-orange-100 text-orange-800 border-orange-200',
  'Yazdırıldı': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Tamamlandı': 'bg-green-100 text-green-800 border-green-200',
  'İade/Hatalı': 'bg-red-100 text-red-800 border-red-200',
};

function SiparisTakip() {
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [raporlar, setRaporlar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [durumFiltre, setDurumFiltre] = useState<string>('Tümü');
  const [baslangicTarih, setBaslangicTarih] = useState('');
  const [bitisTarih, setBitisTarih] = useState('');
  
  // Filtre ve sıralama state'leri
  const [filtreler, setFiltreler] = useState({
    musteri: '',
    urun: '',
  });
  const [siralama, setSiralama] = useState<{
    alan: 'siparis_tarihi' | 'musteri_adi' | 'urun_adi' | 'trendyol_siparis_no' | 'durum';
    yon: 'asc' | 'desc';
  }>({
    alan: 'siparis_tarihi',
    yon: 'asc',
  });

  const loadData = useCallback(async () => {
    try {
      const [siparisData, raporData] = await Promise.all([
        siparisAPI.getAll(durumFiltre !== 'Tümü' ? durumFiltre : undefined),
        raporAPI.getRaporlar(baslangicTarih || undefined, bitisTarih || undefined),
      ]);
      setSiparisler(siparisData);
      setRaporlar(raporData);
    } catch (error) {
      console.error('Veri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  }, [durumFiltre, baslangicTarih, bitisTarih]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtreleme ve sıralama (useMemo ile optimize edildi)
  const filteredSiparisler = useMemo(() => {
    let filtered = [...siparisler];

    // Filtreleme
    if (filtreler.musteri) {
      filtered = filtered.filter(s =>
        s.musteri_adi.toLowerCase().includes(filtreler.musteri.toLowerCase())
      );
    }
    if (filtreler.urun) {
      filtered = filtered.filter(s =>
        s.urun_adi.toLowerCase().includes(filtreler.urun.toLowerCase())
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
        case 'durum':
          aValue = a.durum;
          bValue = b.durum;
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

  const handleFiltrele = useCallback(() => {
    loadData();
  }, [loadData]);

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
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto]">
            Sipariş Takip & Raporlar
          </h2>
          <p className="text-slate-600 mt-0.5 sm:mt-1 font-medium text-xs sm:text-sm">Tüm siparişleri görüntüleyin ve raporları inceleyin</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold text-sm shadow-md touch-manipulation"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Rapor Özeti */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
        {raporlar.map((rapor) => (
          <div
            key={rapor.durum}
            className={`p-3 sm:p-4 rounded-lg border shadow-md ${durumRenkleri[rapor.durum as SiparisDurum] || 'bg-slate-100 text-slate-800 border-slate-200'}`}
          >
            <div className="text-xs sm:text-sm font-medium mb-1">{rapor.durum}</div>
            <div className="text-xl sm:text-2xl font-bold">{rapor.sayi || 0}</div>
            <div className="text-xs mt-1 opacity-80">
              {rapor.toplam_fiyat?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '₺0'}
            </div>
          </div>
        ))}
      </div>

      {/* Filtre ve Sıralama */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200/60 mb-4 p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mb-3">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
              Müşteri Ara
            </label>
            <input
              type="text"
              value={filtreler.musteri}
              onChange={(e) => setFiltreler({ ...filtreler, musteri: e.target.value })}
              placeholder="Müşteri adı..."
              className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700 placeholder-slate-400"
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
              className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700 placeholder-slate-400"
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
              <option value="durum">Durum</option>
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
          {(filtreler.musteri || filtreler.urun) && (
            <button
              onClick={() => setFiltreler({ musteri: '', urun: '' })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg sm:rounded-xl transition-colors font-medium"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Durum ve Tarih Filtreleri */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200/60 mb-4 p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs sm:text-sm font-medium text-slate-700">Filtrele:</span>
          </div>
          <select
            value={durumFiltre}
            onChange={(e) => setDurumFiltre(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700"
          >
            <option value="Tümü">Tüm Durumlar</option>
            <option value="Yeni">Yeni</option>
            <option value="Operasyon Onayı">Operasyon Onayı</option>
            <option value="Üretimde">Üretimde</option>
            <option value="Sertifika">Sertifika</option>
            <option value="Tamamlandı">Tamamlandı</option>
            <option value="İade/Hatalı">İade/Hatalı</option>
          </select>
          <input
            type="date"
            value={baslangicTarih}
            onChange={(e) => setBaslangicTarih(e.target.value)}
            placeholder="Başlangıç Tarihi"
            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700"
          />
          <input
            type="date"
            value={bitisTarih}
            onChange={(e) => setBitisTarih(e.target.value)}
            placeholder="Bitiş Tarihi"
            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700"
          />
          <button
            onClick={handleFiltrele}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold text-xs sm:text-sm shadow-md touch-manipulation"
          >
            Uygula
          </button>
        </div>
      </div>

      {/* Sipariş Listesi */}
      {siparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-4 bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Sipariş bulunamadı</p>
        </div>
      ) : filteredSiparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-4 bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Filtrelere uygun sipariş bulunamadı</p>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 overflow-hidden -mx-2 sm:mx-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/40" style={{ minWidth: '1000px' }}>
              <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200/60">
                <tr>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Sipariş No</th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Tarih</th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider hidden sm:table-cell">Müşteri</th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Ürün</th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider hidden sm:table-cell">Ürün Kodu</th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Miktar</th>
                  <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Durum</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredSiparisler.map((siparis) => (
                  <tr key={siparis.id} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 group active:bg-blue-100/50">
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-sm font-semibold text-slate-900">
                      {siparis.trendyol_siparis_no}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-sm text-slate-600">
                      {(() => {
                        const tarih = typeof siparis.siparis_tarihi === 'string' 
                          ? new Date(parseInt(siparis.siparis_tarihi)) 
                          : new Date(siparis.siparis_tarihi);
                        return isNaN(tarih.getTime()) ? 'Geçersiz Tarih' : format(tarih, 'dd.MM.yyyy');
                      })()}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-sm text-slate-700 font-medium hidden sm:table-cell">
                      {siparis.musteri_adi}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-sm text-slate-600 max-w-xs truncate">
                      {siparis.urun_adi}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap hidden sm:table-cell">
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                        {siparis.urun_kodu || '-'}
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-sm min-w-[35px] text-center ${
                        siparis.miktar > 1 
                          ? 'bg-gradient-to-br from-red-500 to-rose-600 border border-red-400/30' 
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/30'
                      }`}>
                        ×{siparis.miktar}
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded border ${
                          durumRenkleri[siparis.durum]
                        }`}
                      >
                        {siparis.durum}
                      </span>
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

export default SiparisTakip;
