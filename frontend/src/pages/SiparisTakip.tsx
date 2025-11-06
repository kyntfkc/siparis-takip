import { useEffect, useState, useMemo, useCallback } from 'react';
import { siparisAPI, raporAPI } from '../services/api';
import { Siparis, SiparisDurum } from '../types';
import { RefreshCw, Filter } from 'lucide-react';
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
    return <div className="text-center py-12">Yükleniyor...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sipariş Takip & Raporlar</h2>
        <button
          onClick={loadData}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenile
        </button>
      </div>

      {/* Rapor Özeti */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {raporlar.map((rapor) => (
          <div
            key={rapor.durum}
            className={`p-4 rounded-lg border ${durumRenkleri[rapor.durum as SiparisDurum] || 'bg-gray-100'}`}
          >
            <div className="text-sm font-medium">{rapor.durum}</div>
            <div className="text-2xl font-bold mt-1">{rapor.sayi}</div>
            <div className="text-xs mt-1">
              {rapor.toplam_fiyat?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </div>
          </div>
        ))}
      </div>

      {/* Filtre ve Sıralama */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Müşteri Ara
            </label>
            <input
              type="text"
              value={filtreler.musteri}
              onChange={(e) => setFiltreler({ ...filtreler, musteri: e.target.value })}
              placeholder="Müşteri adı..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ürün Ara
            </label>
            <input
              type="text"
              value={filtreler.urun}
              onChange={(e) => setFiltreler({ ...filtreler, urun: e.target.value })}
              placeholder="Ürün adı..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sırala:</label>
            <select
              value={siralama.alan}
              onChange={(e) => setSiralama({ ...siralama, alan: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="siparis_tarihi">Tarih</option>
              <option value="musteri_adi">Müşteri</option>
              <option value="urun_adi">Ürün</option>
              <option value="trendyol_siparis_no">Sipariş No</option>
              <option value="durum">Durum</option>
            </select>
            <button
              onClick={() => setSiralama({ ...siralama, yon: siralama.yon === 'asc' ? 'desc' : 'asc' })}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {siralama.yon === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {filteredSiparisler.length} / {siparisler.length} sipariş
          </div>
          {(filtreler.musteri || filtreler.urun) && (
            <button
              onClick={() => setFiltreler({ musteri: '', urun: '' })}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-700"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Durum ve Tarih Filtreleri */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">Filtrele:</span>
          </div>
          <select
            value={durumFiltre}
            onChange={(e) => setDurumFiltre(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="date"
            value={bitisTarih}
            onChange={(e) => setBitisTarih(e.target.value)}
            placeholder="Bitiş Tarihi"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={handleFiltrele}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Uygula
          </button>
        </div>
      </div>

      {/* Sipariş Listesi */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSiparisler.map((siparis) => (
              <tr key={siparis.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {siparis.trendyol_siparis_no}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(() => {
                    const tarih = typeof siparis.siparis_tarihi === 'string' 
                      ? new Date(parseInt(siparis.siparis_tarihi)) 
                      : new Date(siparis.siparis_tarihi);
                    return isNaN(tarih.getTime()) ? 'Geçersiz Tarih' : format(tarih, 'dd.MM.yyyy');
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {siparis.musteri_adi}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {siparis.urun_adi}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {siparis.miktar}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${
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
        {siparisler.length === 0 && (
          <div className="text-center py-12 text-gray-500">Sipariş bulunamadı</div>
        )}
        {siparisler.length > 0 && filteredSiparisler.length === 0 && (
          <div className="text-center py-12 text-gray-500">Filtrelere uygun sipariş bulunamadı</div>
        )}
      </div>
    </div>
  );
}

export default SiparisTakip;
