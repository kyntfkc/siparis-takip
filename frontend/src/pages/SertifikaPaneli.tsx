import { useEffect, useState, useMemo } from 'react';
import { siparisAPI } from '../services/api';
import { Siparis, SiparisDurum } from '../types';
import { RefreshCw, CheckCircle2, XCircle, Printer, Award, Image, User, ShoppingBag, FileText, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { getSertifikaAyarlari } from '../utils/sertifikaAyarlari';
import { getImageUrl } from '../utils/imageHelper';

function SertifikaPaneli() {
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: number | null;
    durum: SiparisDurum | null;
  }>({ isOpen: false, id: null, durum: null });
  const [notModal, setNotModal] = useState<{
    isOpen: boolean;
    siparisId: number | null;
    not: string;
  }>({ isOpen: false, siparisId: null, not: '' });
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
      // Hem "Sertifika" hem de "Yazdırıldı" durumundaki siparişleri getir
      const [sertifikaData, yazdirildiData] = await Promise.all([
        siparisAPI.getAll('Sertifika'),
        siparisAPI.getAll('Yazdırıldı')
      ]);
      setSiparisler([...sertifikaData, ...yazdirildiData]);
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

  const handleDurumGuncelleClick = (id: number, durum: SiparisDurum) => {
    setConfirmModal({ isOpen: true, id, durum });
  };

  const handleDurumGuncelle = async () => {
    if (!confirmModal.id || !confirmModal.durum) return;
    
    const id = confirmModal.id;
    const durum = confirmModal.durum;
    setConfirmModal({ isOpen: false, id: null, durum: null });
    setUpdating(id);
    
    try {
      await siparisAPI.updateDurum(id, durum);
      if (durum === 'Tamamlandı' || durum === 'İade/Hatalı') {
        setSiparisler(siparisler.filter(s => s.id !== id));
      } else {
        await loadSiparisler();
      }
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
      alert('Durum güncellenirken hata oluştu');
    } finally {
      setUpdating(null);
    }
  };

  const handleYazdir = async (siparis: Siparis) => {
    // Yazdırma işlemi
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up engelleyici açık olabilir. Lütfen izin verin.');
      return;
    }

    // Ayarları yükle
    const ayarlar = getSertifikaAyarlari();

    // Ürün adından altın ayarını çıkar (örn: "14 Ayar Altın" veya "14K" gibi)
    const altinAyari = siparis.urun_adi.match(/14\s*(?:Ayar|K|ayar|k)/i) 
      ? '14 Ayar Altın' 
      : siparis.urun_adi.match(/18\s*(?:Ayar|K|ayar|k)/i)
      ? '18 Ayar Altın'
      : siparis.urun_adi.match(/22\s*(?:Ayar|K|ayar|k)/i)
      ? '22 Ayar Altın'
      : '14 Ayar Altın'; // Varsayılan

    // Ürün fotoğrafı URL'i
    const urunFotoUrl = getImageUrl(siparis.urun_resmi) || '';

    // Ürün adını temizle - "KPA38, one size" gibi kısımları kaldır
    let temizUrunAdi = siparis.urun_adi
      .replace(/,\s*one\s*size/gi, '') // ", one size" kaldır
      .replace(/,\s*[A-Z]{2,}[0-9]+/gi, '') // ", KPA38" gibi virgül sonrası kodları kaldır
      .replace(/\s+[A-Z]{2,}[0-9]+(?:\s|,|$)/gi, ' ') // " KPA38" veya " KPA38," gibi boşluk sonrası kodları kaldır
      .replace(/[A-Z]{2,}[0-9]+\s*,\s*/gi, '') // "KPA38, " gibi başta kodları kaldır
      .replace(/\s+/g, ' ') // Çoklu boşlukları tek boşluğa çevir
      .trim();
    
    // Son kontrol: Eğer hala model kodu varsa (örn: "Küpe KPA38"), kaldır
    const modelKoduRegex = /\b([A-Z]{2,}[0-9]+)\b/gi;
    if (modelKoduRegex.test(temizUrunAdi)) {
      temizUrunAdi = temizUrunAdi.replace(modelKoduRegex, '').replace(/\s+/g, ' ').trim();
    }

    // Sipariş tarihini formatla
    const tarihValue = typeof siparis.siparis_tarihi === 'string' 
      ? new Date(parseInt(siparis.siparis_tarihi)) 
      : new Date(siparis.siparis_tarihi);
    const siparisTarihi = isNaN(tarihValue.getTime()) 
      ? 'Geçersiz Tarih'
      : tarihValue.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sertifika - ${siparis.trendyol_siparis_no}</title>
          <style>
            @page {
              size: ${ayarlar.sayfaGenislik}cm ${ayarlar.sayfaYukseklik}cm;
              margin: 0;
              padding: 0;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              width: ${ayarlar.sayfaGenislik}cm;
              height: ${ayarlar.sayfaYukseklik}cm;
              background-color: #ffffff;
              position: relative;
              overflow: hidden;
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            .container {
              display: flex;
              height: 100%;
              padding: ${ayarlar.genelPadding}cm;
            }
            .left-section {
              width: 50%;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              align-items: flex-start;
              padding: ${ayarlar.solBölümPadding}cm;
            }
            .product-image {
              width: ${ayarlar.fotoğrafGenislik}cm;
              height: ${ayarlar.fotoğrafYukseklik}cm;
              object-fit: contain;
              margin-bottom: 0.5cm;
              background: transparent;
            }
            .product-info {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              text-align: left;
            }
            .product-name {
              font-size: ${ayarlar.ürünAdıFontBoyutu}pt;
              color: #000;
              margin-bottom: 0.3cm;
              line-height: 1.3;
              font-weight: normal;
            }
            .product-code {
              font-size: ${ayarlar.ürünKoduFontBoyutu}pt;
              color: #000;
              margin-bottom: 0.3cm;
              font-weight: normal;
            }
            .gold-info {
              font-size: ${ayarlar.altınAyarıFontBoyutu}pt;
              color: #000;
              font-weight: normal;
            }
            .right-section {
              width: 50%;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              align-items: flex-start;
              padding: ${ayarlar.sagBölümPadding}cm;
            }
            .customer-info {
              display: flex;
              flex-direction: column;
              gap: 0.4cm;
              text-align: left;
            }
            .info-line {
              font-size: ${ayarlar.müşteriBilgisiFontBoyutu}pt;
              color: #000;
              line-height: 1.4;
              font-weight: normal;
            }
            @media print {
              @page {
                size: ${ayarlar.sayfaGenislik}cm ${ayarlar.sayfaYukseklik}cm;
                margin: 0;
                padding: 0;
              }
              body {
                width: ${ayarlar.sayfaGenislik}cm;
                height: ${ayarlar.sayfaYukseklik}cm;
                margin: 0;
                padding: 0;
                overflow: hidden;
              }
              .container {
                page-break-inside: avoid;
                width: 100%;
                height: 100%;
              }
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="left-section">
              ${urunFotoUrl 
                ? `<img src="${urunFotoUrl}" alt="Ürün" class="product-image" onerror="this.style.display='none'" style="position: ${ayarlar.fotoğrafX || ayarlar.fotoğrafY ? 'absolute' : 'relative'}; ${ayarlar.fotoğrafX ? `left: ${ayarlar.fotoğrafX}cm;` : ''} ${ayarlar.fotoğrafY ? `top: ${ayarlar.fotoğrafY}cm;` : ''}">` 
                : `<div class="product-image" style="position: ${ayarlar.fotoğrafX || ayarlar.fotoğrafY ? 'absolute' : 'relative'}; ${ayarlar.fotoğrafX ? `left: ${ayarlar.fotoğrafX}cm;` : ''} ${ayarlar.fotoğrafY ? `top: ${ayarlar.fotoğrafY}cm;` : ''}"></div>`
              }
              <div class="product-info">
                <div class="product-name" style="position: ${ayarlar.ürünAdıX || ayarlar.ürünAdıY ? 'absolute' : 'relative'}; ${ayarlar.ürünAdıX ? `left: ${ayarlar.ürünAdıX}cm;` : ''} ${ayarlar.ürünAdıY ? `top: ${ayarlar.ürünAdıY}cm;` : ''}">${temizUrunAdi}</div>
                ${siparis.urun_kodu ? `<div class="product-code" style="position: ${ayarlar.ürünKoduX || ayarlar.ürünKoduY ? 'absolute' : 'relative'}; ${ayarlar.ürünKoduX ? `left: ${ayarlar.ürünKoduX}cm;` : ''} ${ayarlar.ürünKoduY ? `top: ${ayarlar.ürünKoduY}cm;` : ''}">${siparis.urun_kodu}</div>` : ''}
                <div class="gold-info" style="position: ${ayarlar.altınAyarıX || ayarlar.altınAyarıY ? 'absolute' : 'relative'}; ${ayarlar.altınAyarıX ? `left: ${ayarlar.altınAyarıX}cm;` : ''} ${ayarlar.altınAyarıY ? `top: ${ayarlar.altınAyarıY}cm;` : ''}">${altinAyari}</div>
              </div>
            </div>
            <div class="right-section">
              <div class="customer-info">
                <div class="info-line" style="position: ${ayarlar.müşteriAdıX || ayarlar.müşteriAdıY ? 'absolute' : 'relative'}; ${ayarlar.müşteriAdıX ? `left: ${ayarlar.müşteriAdıX}cm;` : ''} ${ayarlar.müşteriAdıY ? `top: ${ayarlar.müşteriAdıY}cm;` : ''}">${siparis.musteri_adi}</div>
                <div class="info-line" style="position: ${ayarlar.siparişTarihiX || ayarlar.siparişTarihiY ? 'absolute' : 'relative'}; ${ayarlar.siparişTarihiX ? `left: ${ayarlar.siparişTarihiX}cm;` : ''} ${ayarlar.siparişTarihiY ? `top: ${ayarlar.siparişTarihiY}cm;` : ''}">${siparisTarihi}</div>
                <div class="info-line" style="position: ${ayarlar.platformX || ayarlar.platformY ? 'absolute' : 'relative'}; ${ayarlar.platformX ? `left: ${ayarlar.platformX}cm;` : ''} ${ayarlar.platformY ? `top: ${ayarlar.platformY}cm;` : ''}">${siparis.platform === 'Ikas' ? 'indigotaki.com' : 'Trendyol'}</div>
                <div class="info-line" style="position: ${ayarlar.siparişNoX || ayarlar.siparişNoY ? 'absolute' : 'relative'}; ${ayarlar.siparişNoX ? `left: ${ayarlar.siparişNoX}cm;` : ''} ${ayarlar.siparişNoY ? `top: ${ayarlar.siparişNoY}cm;` : ''}">${siparis.trendyol_siparis_no}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Yazdırma penceresi açıldıktan sonra yazdır
    setTimeout(async () => {
      printWindow.print();
      
      // Yazdırıldıktan sonra durumu güncelle
      setUpdating(siparis.id);
      try {
        await siparisAPI.updateDurum(siparis.id, 'Yazdırıldı');
        await loadSiparisler();
      } catch (error) {
        console.error('Durum güncellenemedi:', error);
        alert('Durum güncellenirken hata oluştu');
      } finally {
        setUpdating(null);
      }
    }, 500);
  };

  const getModalTitle = (durum: SiparisDurum) => {
    switch (durum) {
      case 'Tamamlandı':
        return 'Tamamlandı Durumuna Geçir';
      case 'İade/Hatalı':
        return 'İade/Hatalı Durumuna Geçir';
      default:
        return 'Durum Güncelle';
    }
  };

  const getModalMessage = (durum: SiparisDurum) => {
    switch (durum) {
      case 'Tamamlandı':
        return 'Bu siparişi tamamlandı durumuna geçirmek istediğinize emin misiniz?';
      case 'İade/Hatalı':
        return 'Bu siparişi iade/hatalı durumuna geçirmek istediğinize emin misiniz?';
      default:
        return 'Bu işlemi yapmak istediğinize emin misiniz?';
    }
  };

  const getConfirmColor = (durum: SiparisDurum): 'blue' | 'green' | 'red' | 'orange' | 'purple' => {
    switch (durum) {
      case 'Tamamlandı':
        return 'green';
      case 'İade/Hatalı':
        return 'red';
      default:
        return 'blue';
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
            Sertifika
          </h2>
          <p className="text-slate-600 mt-0.5 sm:mt-1 font-medium text-xs sm:text-sm">Sertifika yazdırma ve yönetimi</p>
        </div>
        <button
          onClick={loadSiparisler}
          className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold text-sm shadow-md touch-manipulation"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Filtre ve Sıralama */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200/60 mb-4 overflow-hidden">
        <button
          onClick={() => setFiltreAcik(!filtreAcik)}
          className="w-full flex items-center justify-between p-3 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">Filtre ve Sıralama</h3>
            {(filtreler.musteri || filtreler.urun) && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                {[filtreler.musteri, filtreler.urun].filter(Boolean).length}
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
          <div className="px-3 pb-3 border-t border-slate-200/60">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 pt-3">
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
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-xs sm:text-sm font-medium text-slate-700">Sırala:</label>
            <select
              value={siralama.alan}
              onChange={(e) => setSiralama({ ...siralama, alan: e.target.value as any })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50 text-slate-700 font-medium"
            >
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
        )}
      </div>

      {siparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-4 bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Sertifika aşamasında sipariş bulunamadı</p>
        </div>
      ) : filteredSiparisler.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
          <div className="p-4 bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Filtrelere uygun sipariş bulunamadı</p>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 overflow-hidden -mx-2 sm:mx-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/40" style={{ minWidth: '1000px' }}>
            <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200/60">
              <tr>
                <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Image className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span>Fotoğraf</span>
                  </div>
                </th>
                <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span>Müşteri</span>
                  </div>
                </th>
                <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span>Ürün</span>
                  </div>
                </th>
                <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredSiparisler.map((siparis) => (
                <tr key={siparis.id} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 group active:bg-blue-100/50">
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                    {getImageUrl(siparis.urun_resmi) ? (
                      <div className="relative w-[100px] h-[100px] sm:w-[173px] sm:h-[173px] overflow-hidden rounded-lg border-2 border-slate-200 shadow-md hover:border-blue-300 transition-all duration-200 bg-gradient-to-br from-slate-50 to-slate-100">
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
                      <div className="w-[100px] h-[100px] sm:w-[173px] sm:h-[173px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400 border-2 border-slate-200 shadow-sm">
                        Resim Yok
                      </div>
                    )}
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-xs sm:text-sm text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors">
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
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const { satir1, satir2 } = formatUrunAdi(siparis.urun_adi);
                          return (
                            <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="text-xs sm:text-sm text-slate-800 font-semibold leading-tight group-hover:text-blue-700 transition-colors">
                                {satir1}
                              </div>
                              {satir2 && (
                                <div className="text-xs sm:text-sm text-slate-600 leading-tight flex items-center gap-1.5">
                                  <span className="text-blue-600 font-bold">•</span>
                                  {satir2}
                                  </div>
                                )}
                              </div>
                              {siparis.not && (
                                <div className="mt-0.5 sm:mt-2 p-1.5 sm:p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg sm:rounded-xl shadow-sm">
                                  <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed font-medium">
                                    {siparis.not}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <span className={`px-2 sm:px-2.5 py-1 sm:py-1.5 text-white text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap shadow-sm flex-shrink-0 border min-w-[35px] sm:min-w-[50px] text-center ${
                        siparis.miktar > 1 
                          ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-400/30' 
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/30'
                      }`}>
                        ×{siparis.miktar}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Not Butonu */}
                      <button
                        onClick={() => handleNotClick(siparis)}
                        disabled={updating === siparis.id}
                        className={`flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] rounded-lg hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-xs sm:text-sm font-semibold shadow-sm touch-manipulation ${
                          siparis.not
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-2 border-blue-400/30'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-2 border-slate-200'
                        }`}
                      >
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">{siparis.not ? 'Not Düzenle' : 'Not Ekle'}</span>
                      </button>
                      <button
                        onClick={() => handleYazdir(siparis)}
                        disabled={updating === siparis.id}
                        className="flex items-center justify-center px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all font-semibold shadow-md touch-manipulation"
                      >
                        {updating === siparis.id ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4 mr-2" />
                        )}
                        Sertifika Yazdır
                      </button>
                      <button
                        onClick={() => handleDurumGuncelleClick(siparis.id, 'Tamamlandı')}
                        disabled={updating === siparis.id}
                        className="flex items-center justify-center px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all font-semibold shadow-md touch-manipulation"
                      >
                        {updating === siparis.id ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Tamamlandı
                      </button>
                      <button
                        onClick={() => handleDurumGuncelleClick(siparis.id, 'İade/Hatalı')}
                        disabled={updating === siparis.id}
                        className="flex items-center justify-center px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg text-sm hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all font-semibold shadow-md touch-manipulation"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        İade/Hatalı
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

      {/* Onay Modal */}
      {confirmModal.durum && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={getModalTitle(confirmModal.durum)}
          message={getModalMessage(confirmModal.durum)}
          onConfirm={handleDurumGuncelle}
          onCancel={() => setConfirmModal({ isOpen: false, id: null, durum: null })}
          confirmText="Onayla"
          cancelText="İptal"
          confirmColor={getConfirmColor(confirmModal.durum)}
        />
      )}
    </div>
  );
}

export default SertifikaPaneli;

