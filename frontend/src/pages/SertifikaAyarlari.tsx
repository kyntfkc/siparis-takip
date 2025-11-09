import { useState, useEffect } from 'react';
import { Save, RotateCcw, Users, Settings, Plus, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { getSertifikaAyarlari, varsayilanAyarlar, SertifikaAyarlari as SertifikaAyarlariType } from '../utils/sertifikaAyarlari';
import { authAPI, User } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

type TabType = 'sertifika' | 'kullanicilar';

function SertifikaAyarlari() {
  const [activeTab, setActiveTab] = useState<TabType>('sertifika');
  const [ayarlar, setAyarlar] = useState<SertifikaAyarlariType>(varsayilanAyarlar);
  const [kaydedildi, setKaydedildi] = useState(false);
  
  // Kullanıcı yönetimi state'leri
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [userModal, setUserModal] = useState<{
    isOpen: boolean;
    user: User | null;
    mode: 'create' | 'edit';
  }>({ isOpen: false, user: null, mode: 'create' });
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'operasyon' as 'operasyon' | 'atolye' | 'yonetici',
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    userId: string | null;
  }>({ isOpen: false, userId: null });
  const [error, setError] = useState('');

  useEffect(() => {
    // localStorage'dan ayarları yükle
    setAyarlar(getSertifikaAyarlari());
    
    // Kullanıcı yönetimi sekmesindeyse kullanıcıları yükle
    if (activeTab === 'kullanicilar') {
      loadUsers();
    }
  }, [activeTab]);

  const handleAyarlarDegistir = (key: keyof SertifikaAyarlariType, value: string) => {
    setAyarlar(prev => ({ ...prev, [key]: value }));
    setKaydedildi(false);
  };

  const handleKaydet = () => {
    localStorage.setItem('sertifikaAyarlari', JSON.stringify(ayarlar));
    setKaydedildi(true);
    setTimeout(() => setKaydedildi(false), 2000);
  };

  const handleSifirla = () => {
    setAyarlar(varsayilanAyarlar);
    localStorage.removeItem('sertifikaAyarlari');
  };

  // Kullanıcı yönetimi fonksiyonları
  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.getUsers();
      if (response.success && response.users) {
        setUsers(response.users);
      } else {
        setError(response.error || 'Kullanıcılar yüklenemedi');
      }
    } catch (err: any) {
      console.error('Kullanıcılar yüklenemedi:', err);
      setError('Kullanıcılar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setUserForm({ username: '', password: '', role: 'operasyon' });
    setUserModal({ isOpen: true, user: null, mode: 'create' });
    setError('');
  };

  const handleEditUser = (user: User) => {
    setUserForm({ username: user.username, password: '', role: user.role });
    setUserModal({ isOpen: true, user, mode: 'edit' });
    setError('');
  };

  const handleSaveUser = async () => {
    if (!userForm.username || (!userForm.password && userModal.mode === 'create')) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (userModal.mode === 'create') {
        const response = await authAPI.createUser(userForm.username, userForm.password, userForm.role);
        if (response.success) {
          setUserModal({ isOpen: false, user: null, mode: 'create' });
          await loadUsers();
        } else {
          setError(response.error || 'Kullanıcı oluşturulamadı');
        }
      } else {
        const updates: { username?: string; password?: string; role?: 'operasyon' | 'atolye' | 'yonetici' } = {
          username: userForm.username,
          role: userForm.role,
        };
        if (userForm.password) {
          updates.password = userForm.password;
        }
        const response = await authAPI.updateUser(userModal.user!.id, updates);
        if (response.success) {
          setUserModal({ isOpen: false, user: null, mode: 'create' });
          await loadUsers();
        } else {
          setError(response.error || 'Kullanıcı güncellenemedi');
        }
      }
    } catch (err: any) {
      console.error('Kullanıcı kaydedilemedi:', err);
      setError(err.response?.data?.error || 'Kullanıcı kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.userId) return;

    setLoading(true);
    try {
      const response = await authAPI.deleteUser(deleteModal.userId);
      if (response.success) {
        setDeleteModal({ isOpen: false, userId: null });
        await loadUsers();
      } else {
        setError(response.error || 'Kullanıcı silinemedi');
      }
    } catch (err: any) {
      console.error('Kullanıcı silinemedi:', err);
      setError(err.response?.data?.error || 'Kullanıcı silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'operasyon': return 'Operasyon';
      case 'atolye': return 'Atölye';
      case 'yonetici': return 'Yönetici';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'operasyon': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'atolye': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'yonetici': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto]">
            Ayarlar
          </h2>
          <p className="text-slate-600 mt-0.5 sm:mt-1 font-medium text-xs sm:text-sm">Sistem ayarlarını yönetin</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('sertifika')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'sertifika'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Sertifika Ayarları</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('kullanicilar')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'kullanicilar'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Kullanıcı Yönetimi</span>
            </div>
          </button>
        </div>
      </div>

      {/* Sertifika Ayarları Tab */}
      {activeTab === 'sertifika' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={handleSifirla}
                className="flex items-center px-3 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Varsayılana Dön
              </button>
              <button
                onClick={handleKaydet}
                className="flex items-center px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                Kaydet
              </button>
            </div>
          </div>

      {kaydedildi && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 rounded-xl shadow-sm">
          ✅ Ayarlar başarıyla kaydedildi!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sayfa Ayarları */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200/60">
          <h3 className="text-base font-semibold mb-3 text-slate-800">Sayfa</h3>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Genişlik (cm)</label>
              <input
                type="number"
                step="0.1"
                value={ayarlar.sayfaGenislik}
                onChange={(e) => handleAyarlarDegistir('sayfaGenislik', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Yükseklik (cm)</label>
              <input
                type="number"
                step="0.1"
                value={ayarlar.sayfaYukseklik}
                onChange={(e) => handleAyarlarDegistir('sayfaYukseklik', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Padding (cm)</label>
              <input
                type="number"
                step="0.1"
                value={ayarlar.genelPadding}
                onChange={(e) => handleAyarlarDegistir('genelPadding', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Fotoğraf Ayarları */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200/60">
          <h3 className="text-base font-semibold mb-3 text-slate-800">Fotoğraf</h3>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Konum</label>
              <select
                value={ayarlar.fotoğrafKonumu}
                onChange={(e) => handleAyarlarDegistir('fotoğrafKonumu', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sol-ust">Sol Üst</option>
                <option value="sol-alt">Sol Alt</option>
                <option value="sag-ust">Sağ Üst</option>
                <option value="sag-alt">Sağ Alt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Genişlik (cm)</label>
              <input
                type="number"
                step="0.1"
                value={ayarlar.fotoğrafGenislik}
                onChange={(e) => handleAyarlarDegistir('fotoğrafGenislik', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Yükseklik (cm)</label>
              <input
                type="number"
                step="0.1"
                value={ayarlar.fotoğrafYukseklik}
                onChange={(e) => handleAyarlarDegistir('fotoğrafYukseklik', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sol Bölüm Ayarları */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200/60">
          <h3 className="text-base font-semibold mb-3 text-slate-800">Sol Bölüm</h3>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hizalama</label>
              <select
                value={ayarlar.solBölümHizalama}
                onChange={(e) => handleAyarlarDegistir('solBölümHizalama', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sol">Sol</option>
                <option value="orta">Orta</option>
                <option value="sag">Sağ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Padding (cm)</label>
              <input
                type="number"
                step="0.1"
                value={ayarlar.solBölümPadding}
                onChange={(e) => handleAyarlarDegistir('solBölümPadding', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ürün Adı Font (pt)</label>
              <input
                type="number"
                step="0.5"
                value={ayarlar.ürünAdıFontBoyutu}
                onChange={(e) => handleAyarlarDegistir('ürünAdıFontBoyutu', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kodu Font (pt)</label>
              <input
                type="number"
                step="0.5"
                value={ayarlar.ürünKoduFontBoyutu}
                onChange={(e) => handleAyarlarDegistir('ürünKoduFontBoyutu', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Altın Font (pt)</label>
              <input
                type="number"
                step="0.5"
                value={ayarlar.altınAyarıFontBoyutu}
                onChange={(e) => handleAyarlarDegistir('altınAyarıFontBoyutu', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sağ Bölüm Ayarları */}
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200/60">
          <h3 className="text-base font-semibold mb-3 text-slate-800">Sağ Bölüm</h3>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hizalama</label>
              <select
                value={ayarlar.sagBölümHizalama}
                onChange={(e) => handleAyarlarDegistir('sagBölümHizalama', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sol">Sol</option>
                <option value="orta">Orta</option>
                <option value="sag">Sağ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Padding (cm)</label>
              <input
                type="number"
                step="0.1"
                value={ayarlar.sagBölümPadding}
                onChange={(e) => handleAyarlarDegistir('sagBölümPadding', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Müşteri Font (pt)</label>
              <input
                type="number"
                step="0.5"
                value={ayarlar.müşteriBilgisiFontBoyutu}
                onChange={(e) => handleAyarlarDegistir('müşteriBilgisiFontBoyutu', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Satır Aralığı (cm)</label>
              <input
                type="number"
                step="0.1"
                value={ayarlar.bilgiSatırAraligi}
                onChange={(e) => handleAyarlarDegistir('bilgiSatırAraligi', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hassas Pozisyon Ayarları */}
      <div className="mt-3 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-200/60">
        <h3 className="text-sm font-semibold mb-2 text-slate-800">Pozisyon Ayarları (cm)</h3>
        <p className="text-xs text-slate-600 mb-2">
          Her elementin pozisyonunu cm cinsinden ayarlayın. Sol üst köşe (0,0).
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {/* Fotoğraf Pozisyon */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5">📷 Fotoğraf</h4>
            <div className="space-y-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Yatay (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.fotoğrafX || ''}
                  onChange={(e) => handleAyarlarDegistir('fotoğrafX', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Dikey (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.fotoğrafY || ''}
                  onChange={(e) => handleAyarlarDegistir('fotoğrafY', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Ürün Adı Pozisyon */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5">🏷️ Ürün Adı</h4>
            <div className="space-y-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Yatay (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.ürünAdıX || ''}
                  onChange={(e) => handleAyarlarDegistir('ürünAdıX', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Dikey (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.ürünAdıY || ''}
                  onChange={(e) => handleAyarlarDegistir('ürünAdıY', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Ürün Kodu Pozisyon */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5">🔢 Model Kodu</h4>
            <div className="space-y-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Yatay (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.ürünKoduX || ''}
                  onChange={(e) => handleAyarlarDegistir('ürünKoduX', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Dikey (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.ürünKoduY || ''}
                  onChange={(e) => handleAyarlarDegistir('ürünKoduY', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Altın Ayarı Pozisyon */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5">✨ Altın</h4>
            <div className="space-y-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Yatay (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.altınAyarıX || ''}
                  onChange={(e) => handleAyarlarDegistir('altınAyarıX', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Dikey (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.altınAyarıY || ''}
                  onChange={(e) => handleAyarlarDegistir('altınAyarıY', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Müşteri Adı Pozisyon */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5">👤 Alıcı</h4>
            <div className="space-y-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Yatay (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.müşteriAdıX || ''}
                  onChange={(e) => handleAyarlarDegistir('müşteriAdıX', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Dikey (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.müşteriAdıY || ''}
                  onChange={(e) => handleAyarlarDegistir('müşteriAdıY', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Sipariş Tarihi Pozisyon */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5">📅 Tarih</h4>
            <div className="space-y-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Yatay (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.siparişTarihiX || ''}
                  onChange={(e) => handleAyarlarDegistir('siparişTarihiX', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Dikey (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.siparişTarihiY || ''}
                  onChange={(e) => handleAyarlarDegistir('siparişTarihiY', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Platform Pozisyon */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5">🛒 Platform</h4>
            <div className="space-y-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Yatay (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.platformX || ''}
                  onChange={(e) => handleAyarlarDegistir('platformX', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Dikey (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.platformY || ''}
                  onChange={(e) => handleAyarlarDegistir('platformY', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* Sipariş No Pozisyon */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5">🔢 Sipariş No</h4>
            <div className="space-y-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Yatay (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.siparişNoX || ''}
                  onChange={(e) => handleAyarlarDegistir('siparişNoX', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Dikey (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ayarlar.siparişNoY || ''}
                  onChange={(e) => handleAyarlarDegistir('siparişNoY', e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Not:</strong> Ayarlar değişikliklerinin etkili olması için "Kaydet" butonuna tıklayın.
            </p>
          </div>
        </>
      )}

      {/* Kullanıcı Yönetimi Tab */}
      {activeTab === 'kullanicilar' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Kullanıcılar</h3>
              <p className="text-xs text-slate-600 mt-1">Sistem kullanıcılarını yönetin</p>
            </div>
            <button
              onClick={handleCreateUser}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-semibold text-sm shadow-md touch-manipulation"
            >
              <Plus className="w-4 h-4" />
              Yeni Kullanıcı
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {kaydedildi && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>İşlem başarıyla tamamlandı!</span>
            </div>
          )}

          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium text-sm">Yükleniyor...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200/40" style={{ minWidth: '600px' }}>
                  <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-slate-200/60">
                    <tr>
                      <th className="px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Kullanıcı Adı</th>
                      <th className="px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Rol</th>
                      <th className="px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider hidden sm:table-cell">Oluşturulma</th>
                      <th className="px-3 py-2 sm:py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200">
                        <td className="px-3 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-800">{user.username}</div>
                        </td>
                        <td className="px-3 py-2 sm:py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-3 py-2 sm:py-3 whitespace-nowrap text-xs text-slate-500 hidden sm:table-cell">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td className="px-3 py-2 sm:py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors font-medium"
                              title="Düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, userId: user.id })}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-medium"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

          {/* Kullanıcı Ekleme/Düzenleme Modal */}
          {userModal.isOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">
                    {userModal.mode === 'create' ? 'Yeni Kullanıcı' : 'Kullanıcı Düzenle'}
                  </h3>
                  <button
                    onClick={() => setUserModal({ isOpen: false, user: null, mode: 'create' })}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı Adı</label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700"
                      placeholder="Kullanıcı adı"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Şifre {userModal.mode === 'edit' && '(Değiştirmek için doldurun)'}
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700"
                      placeholder="Şifre"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'operasyon' | 'atolye' | 'yonetici' })}
                      className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-700"
                    >
                      <option value="operasyon">Operasyon</option>
                      <option value="atolye">Atölye</option>
                      <option value="yonetici">Yönetici</option>
                    </select>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setUserModal({ isOpen: false, user: null, mode: 'create' })}
                      className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSaveUser}
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Silme Onay Modal */}
          <ConfirmModal
            isOpen={deleteModal.isOpen}
            onCancel={() => setDeleteModal({ isOpen: false, userId: null })}
            onConfirm={handleDeleteUser}
            title="Kullanıcıyı Sil"
            message="Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
            confirmText="Sil"
            cancelText="İptal"
            confirmColor="red"
          />
        </div>
      )}
    </div>
  );
}

export default SertifikaAyarlari;

