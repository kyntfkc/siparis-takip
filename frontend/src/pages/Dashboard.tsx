import { useEffect, useState, useMemo, useCallback } from 'react';
import { siparisAPI, raporAPI } from '../services/api';
import { Siparis, SiparisDurum } from '../types';
import { 
  Package, Wrench, Award, CheckCircle, AlertCircle, TrendingUp, 
  Clock, RefreshCw, ArrowRight, ShoppingCart, BarChart3,
  Calendar, Printer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const durumRenkleri: Record<SiparisDurum, string> = {
  'Yeni': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Operasyon Onayı': 'bg-blue-100 text-blue-800 border-blue-200',
  'Üretimde': 'bg-purple-100 text-purple-800 border-purple-200',
  'Sertifika': 'bg-orange-100 text-orange-800 border-orange-200',
  'Yazdırıldı': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Tamamlandı': 'bg-green-100 text-green-800 border-green-200',
  'İade/Hatalı': 'bg-red-100 text-red-800 border-red-200',
};

const durumIkonlari: Record<SiparisDurum, any> = {
  'Yeni': Package,
  'Operasyon Onayı': Clock,
  'Üretimde': Wrench,
  'Sertifika': Award,
  'Yazdırıldı': Printer,
  'Tamamlandı': CheckCircle,
  'İade/Hatalı': AlertCircle,
};

function Dashboard() {
  const navigate = useNavigate();
  const [raporlar, setRaporlar] = useState<any[]>([]);
  const [sonSiparisler, setSonSiparisler] = useState<Siparis[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [raporData, tumSiparisler] = await Promise.all([
        raporAPI.getRaporlar(),
        siparisAPI.getAll(),
      ]);

      const durumSirasi: SiparisDurum[] = ['Yeni', 'Operasyon Onayı', 'Üretimde', 'Sertifika', 'Yazdırıldı', 'Tamamlandı', 'İade/Hatalı'];
      const siraliRaporlar = durumSirasi.map(durum => {
        const rapor = raporData.find((r: any) => r.durum === durum);
        return rapor || { durum, sayi: 0, toplam_fiyat: 0 };
      });

      setRaporlar(siraliRaporlar);

      const sonSiparisler = [...tumSiparisler]
        .sort((a, b) => {
          const dateA = typeof a.siparis_tarihi === 'string' ? new Date(parseInt(a.siparis_tarihi)).getTime() : (a.siparis_tarihi as number);
          const dateB = typeof b.siparis_tarihi === 'string' ? new Date(parseInt(b.siparis_tarihi)).getTime() : (b.siparis_tarihi as number);
          return dateB - dateA;
        })
        .slice(0, 10);
      setSonSiparisler(sonSiparisler);
    } catch (error: any) {
      console.error('Dashboard verileri yüklenemedi:', error);
      console.error('Error details:', error?.response?.data || error?.message);
      // Hata durumunda kullanıcıya bilgi ver
      if (error?.response?.status === 500) {
        console.error('Backend 500 hatası - detaylar:', error?.response?.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5 * 60 * 1000); // 5 dakika (optimized from 60 seconds)
    return () => clearInterval(interval);
  }, [loadDashboard]);

  // useMemo ile hesaplanan değerler
  const { toplamSiparis, yeniSiparis, uretimdeSiparis, sertifikaSiparis } = useMemo(() => {
    const toplam = raporlar.reduce((toplam, rapor) => toplam + (rapor.sayi || 0), 0);
    const yeni = raporlar.find(r => r.durum === 'Yeni')?.sayi || 0;
    const uretimde = raporlar.find(r => r.durum === 'Üretimde')?.sayi || 0;
    const sertifika = raporlar.find(r => r.durum === 'Sertifika')?.sayi || 0;
    
    return { 
      toplamSiparis: toplam, 
      yeniSiparis: yeni,
      uretimdeSiparis: uretimde,
      sertifikaSiparis: sertifika
    };
  }, [raporlar]);

  const { son7GunlukSiparisler, son7GunlukYeni, son7GunlukTamamlanan } = useMemo(() => {
    const son7GunBaslangic = new Date();
    son7GunBaslangic.setDate(son7GunBaslangic.getDate() - 7);
    const filtered = sonSiparisler.filter(s => {
      const tarih = typeof s.siparis_tarihi === 'string' ? new Date(parseInt(s.siparis_tarihi)).getTime() : (s.siparis_tarihi as number);
      return tarih >= son7GunBaslangic.getTime();
    });
    return {
      son7GunlukSiparisler: filtered,
      son7GunlukYeni: filtered.filter(s => s.durum === 'Yeni').length,
      son7GunlukTamamlanan: filtered.filter(s => s.durum === 'Tamamlandı').length
    };
  }, [sonSiparisler]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto]">Dashboard</h1>
            <p className="text-slate-600 text-sm mt-1 font-medium">Sipariş takip sistemi genel bakış</p>
          </div>
          <button
            onClick={loadDashboard}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold text-sm shadow-md touch-manipulation"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Yenile</span>
          </button>
        </div>

        {/* İkinci Satır İstatistikler */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Yeni Siparişler */}
          <div 
            onClick={() => navigate('/operasyon')}
            className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-200/60 hover:border-yellow-400 group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                <Package className="w-5 h-5 text-yellow-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-yellow-600 transition-all" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{yeniSiparis}</p>
            <p className="text-slate-600 text-xs font-medium">Yeni Sipariş</p>
          </div>

          {/* Üretimde */}
          <div 
            onClick={() => navigate('/atolye')}
            className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-200/60 hover:border-purple-400 group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Wrench className="w-5 h-5 text-purple-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-all" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{uretimdeSiparis}</p>
            <p className="text-slate-600 text-xs font-medium">Üretimde</p>
          </div>

          {/* Sertifika */}
          <div 
            onClick={() => navigate('/sertifika')}
            className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-200/60 hover:border-orange-400 group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                <Award className="w-5 h-5 text-orange-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-all" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{sertifikaSiparis}</p>
            <p className="text-slate-600 text-xs font-medium">Sertifika</p>
          </div>
        </div>

        {/* Alt Bölüm */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Durum Dağılımı */}
          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200/60">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <div className="p-1 bg-blue-500 rounded">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </div>
              Durum Dağılımı
            </h3>
            <div className="space-y-1.5">
              {raporlar.filter(r => r.durum !== 'İade/Hatalı').map((rapor) => {
                const DurumIkoni = durumIkonlari[rapor.durum as SiparisDurum] || Package;
                const renk = durumRenkleri[rapor.durum as SiparisDurum] || 'bg-gray-100 text-gray-800 border-gray-200';
                const yuzde = toplamSiparis > 0 ? Math.round((rapor.sayi / toplamSiparis) * 100) : 0;
                
                return (
                  <div
                    key={rapor.durum}
                    className={`p-1.5 sm:p-2 rounded border cursor-pointer hover:shadow-sm transition-all duration-200 ${renk}`}
                    onClick={() => {
                      if (rapor.durum === 'Yeni') navigate('/operasyon');
                      else if (rapor.durum === 'Üretimde') navigate('/atolye');
                      else if (rapor.durum === 'Sertifika') navigate('/sertifika');
                      else if (rapor.durum === 'Tamamlandı') navigate('/tamamlandi');
                    }}
                  >
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <DurumIkoni className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="font-medium text-xs">{rapor.durum}</span>
                      </div>
                      <span className="text-sm sm:text-base font-bold">{rapor.sayi || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 sm:h-1.5 overflow-hidden">
                      <div
                        className={`h-1 sm:h-1.5 rounded-full transition-all duration-1000 ${
                          rapor.durum === 'Yeni' ? 'bg-yellow-500' :
                          rapor.durum === 'Operasyon Onayı' ? 'bg-blue-500' :
                          rapor.durum === 'Üretimde' ? 'bg-purple-500' :
                          rapor.durum === 'Sertifika' ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${yuzde}%` }}
                      ></div>
                    </div>
                    <div className="text-right mt-0.5">
                      <span className="text-xs opacity-70">%{yuzde}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Son 7 Günlük İstatistikler */}
          <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200/60">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              Son 7 Günlük Özet
            </h3>
            <div className="space-y-1.5">
              <div className="p-1.5 sm:p-2 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                    <span className="font-medium text-xs text-blue-900">Yeni Sipariş</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-blue-900">{son7GunlukYeni}</span>
                </div>
              </div>
              
              <div className="p-1.5 sm:p-2 bg-green-50 rounded border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
                    <span className="font-medium text-xs text-green-900">Tamamlanan</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-green-900">{son7GunlukTamamlanan}</span>
                </div>
              </div>
              
              <div className="p-1.5 sm:p-2 bg-purple-50 rounded border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600" />
                    <span className="font-medium text-xs text-purple-900">Toplam</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-purple-900">{son7GunlukSiparisler.length}</span>
                </div>
              </div>

              {son7GunlukTamamlanan > 0 && son7GunlukSiparisler.length > 0 && (
                <div className="p-1.5 sm:p-2 bg-gray-50 rounded border border-gray-200 mt-1 sm:mt-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-700 font-medium">Tamamlanma Oranı</span>
                    <span className="font-bold text-green-600 text-xs sm:text-sm">
                      %{Math.round((son7GunlukTamamlanan / son7GunlukSiparisler.length) * 100)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Son Siparişler */}
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200/60">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-lg">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              Son Siparişler
            </h3>
          </div>
          {sonSiparisler.length === 0 ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
              <div className="p-3 bg-slate-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-600 text-sm font-medium">Sipariş bulunamadı</p>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 overflow-hidden -mx-2 sm:mx-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/40" style={{ minWidth: '800px' }}>
                  <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Sipariş No</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Tarih</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Müşteri</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Ürün</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {sonSiparisler.map((siparis) => {
                      const tarih = typeof siparis.siparis_tarihi === 'string' 
                        ? new Date(parseInt(siparis.siparis_tarihi)) 
                        : new Date(siparis.siparis_tarihi as number);
                      
                      return (
                        <tr
                          key={siparis.id}
                          className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 group active:bg-blue-100/50"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900">
                            {siparis.trendyol_siparis_no}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            {tarih.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 font-medium">
                            {siparis.musteri_adi}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                            {siparis.urun_adi}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded border ${
                                durumRenkleri[siparis.durum]
                              }`}
                            >
                              {siparis.durum}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

export default Dashboard;
