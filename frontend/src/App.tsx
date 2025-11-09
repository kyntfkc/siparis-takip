import { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Wrench, Award, CheckCircle, Settings, RefreshCw, Menu, X, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OperasyonPaneli = lazy(() => import('./pages/OperasyonPaneli'));
const AtolyePaneli = lazy(() => import('./pages/AtolyePaneli'));
const SertifikaPaneli = lazy(() => import('./pages/SertifikaPaneli'));
const TamamlandiPaneli = lazy(() => import('./pages/TamamlandiPaneli'));
const SertifikaAyarlari = lazy(() => import('./pages/SertifikaAyarlari'));

function AppContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, hasAccess, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Loading durumunda bekle
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Rol bazlı menü öğeleri
  const getMenuItems = () => {
    const items = [];

    // Dashboard - sadece yönetici
    if (hasAccess(['yonetici'])) {
      items.push({
        path: '/',
        icon: LayoutDashboard,
        label: 'Dashboard',
        roles: ['yonetici'] as const,
      });
    }

    // Yeni Sipariş - operasyon ve yönetici
    if (hasAccess(['operasyon', 'yonetici'])) {
      items.push({
        path: '/operasyon',
        icon: Package,
        label: 'Yeni Sipariş',
        roles: ['operasyon', 'yonetici'] as const,
      });
    }

    // Atölye - atolye ve yönetici
    if (hasAccess(['atolye', 'yonetici'])) {
      items.push({
        path: '/atolye',
        icon: Wrench,
        label: 'Atölye',
        roles: ['atolye', 'yonetici'] as const,
      });
    }

    // Sertifika - operasyon ve yönetici
    if (hasAccess(['operasyon', 'yonetici'])) {
      items.push({
        path: '/sertifika',
        icon: Award,
        label: 'Sertifika',
        roles: ['operasyon', 'yonetici'] as const,
      });
    }

    // Tamamlandı - operasyon ve yönetici
    if (hasAccess(['operasyon', 'yonetici'])) {
      items.push({
        path: '/tamamlandi',
        icon: CheckCircle,
        label: 'Tamamlandı',
        roles: ['operasyon', 'yonetici'] as const,
      });
    }

    // Ayarlar - sadece yönetici
    if (hasAccess(['yonetici'])) {
      items.push({
        path: '/sertifika-ayarlari',
        icon: Settings,
        label: 'Ayarlar',
        roles: ['yonetici'] as const,
      });
    }

    return items;
  };

  const menuItems = getMenuItems();

  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!user) {
    return null; // AuthProvider içinde yönlendirme yapılacak
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mr-2 sm:mr-3">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  Sipariş Takip
                </h1>
              </div>
              <div className="hidden sm:ml-10 sm:flex sm:space-x-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
            
            {/* Kullanıcı Bilgisi ve Çıkış Butonu */}
            <div className="flex items-center gap-3">
              {user && (
                <>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                    <span className="text-xs font-medium text-slate-700">{user.username}</span>
                    <span className="text-xs text-slate-500">({user.role})</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Çıkış Yap</span>
                  </button>
                </>
              )}
              
              {/* Mobil Menü Butonu */}
              <div className="sm:hidden flex items-center">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-expanded="false"
                >
                  {mobileMenuOpen ? (
                    <>
                      <X className="block h-5 w-5" />
                      <span className="text-sm font-medium">Kapat</span>
                    </>
                  ) : (
                    <>
                      <Menu className="block h-5 w-5" />
                      <span className="text-sm font-medium">Menü</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobil Menü Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </NavLink>
                );
              })}
              {user && (
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <div className="px-3 py-2 text-xs text-slate-600">
                    <span className="font-medium">{user.username}</span>
                    <span className="text-slate-500"> ({user.role})</span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Yükleniyor...</p>
              </div>
            </div>
          }>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={['yonetici']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/operasyon"
                element={
                  <ProtectedRoute allowedRoles={['operasyon', 'yonetici']}>
                    <OperasyonPaneli />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/atolye"
                element={
                  <ProtectedRoute allowedRoles={['atolye', 'yonetici']}>
                    <AtolyePaneli />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sertifika"
                element={
                  <ProtectedRoute allowedRoles={['operasyon', 'yonetici']}>
                    <SertifikaPaneli />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tamamlandi"
                element={
                  <ProtectedRoute allowedRoles={['operasyon', 'yonetici']}>
                    <TamamlandiPaneli />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sertifika-ayarlari"
                element={
                  <ProtectedRoute allowedRoles={['yonetici']}>
                    <SertifikaAyarlari />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
