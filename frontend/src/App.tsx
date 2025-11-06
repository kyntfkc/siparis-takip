import { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Wrench, Award, CheckCircle, Settings, RefreshCw, Menu, X } from 'lucide-react';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OperasyonPaneli = lazy(() => import('./pages/OperasyonPaneli'));
const AtolyePaneli = lazy(() => import('./pages/AtolyePaneli'));
const SertifikaPaneli = lazy(() => import('./pages/SertifikaPaneli'));
const TamamlandiPaneli = lazy(() => import('./pages/TamamlandiPaneli'));
const SertifikaAyarlari = lazy(() => import('./pages/SertifikaAyarlari'));

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <BrowserRouter>
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
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      `inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                      }`
                    }
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/operasyon"
                    className={({ isActive }) =>
                      `inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                      }`
                    }
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Yeni Sipariş
                  </NavLink>
                  <NavLink
                    to="/atolye"
                    className={({ isActive }) =>
                      `inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                      }`
                    }
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Atölye
                  </NavLink>
                  <NavLink
                    to="/sertifika"
                    className={({ isActive }) =>
                      `inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                      }`
                    }
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Sertifika
                  </NavLink>
                  <NavLink
                    to="/tamamlandi"
                    className={({ isActive }) =>
                      `inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                      }`
                    }
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Tamamlandı
                  </NavLink>
                  <NavLink
                    to="/sertifika-ayarlari"
                    className={({ isActive }) =>
                      `inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                      }`
                    }
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Ayarlar
                  </NavLink>
                </div>
              </div>
              
              {/* Mobil Menü Butonu */}
              <div className="sm:hidden flex items-center">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-expanded="false"
                >
                  {mobileMenuOpen ? (
                    <X className="block h-6 w-6" />
                  ) : (
                    <Menu className="block h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobil Menü Dropdown */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <NavLink
                  to="/"
                  end
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`
                  }
                >
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  Dashboard
                </NavLink>
                <NavLink
                  to="/operasyon"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`
                  }
                >
                  <Package className="w-5 h-5 mr-3" />
                  Yeni Sipariş
                </NavLink>
                <NavLink
                  to="/atolye"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`
                  }
                >
                  <Wrench className="w-5 h-5 mr-3" />
                  Atölye
                </NavLink>
                <NavLink
                  to="/sertifika"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`
                  }
                >
                  <Award className="w-5 h-5 mr-3" />
                  Sertifika
                </NavLink>
                <NavLink
                  to="/tamamlandi"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`
                  }
                >
                  <CheckCircle className="w-5 h-5 mr-3" />
                  Tamamlandı
                </NavLink>
                <NavLink
                  to="/sertifika-ayarlari"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`
                  }
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Ayarlar
                </NavLink>
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
                <Route path="/" element={<Dashboard />} />
                <Route path="/operasyon" element={<OperasyonPaneli />} />
                <Route path="/atolye" element={<AtolyePaneli />} />
                <Route path="/sertifika" element={<SertifikaPaneli />} />
                <Route path="/sertifika-ayarlari" element={<SertifikaAyarlari />} />
                <Route path="/tamamlandi" element={<TamamlandiPaneli />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
