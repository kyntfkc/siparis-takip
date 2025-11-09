import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

export type UserRole = 'operasyon' | 'atolye' | 'yonetici';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sayfa yüklendiğinde localStorage'dan kullanıcı bilgisini al ve backend'den doğrula
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Backend'den kullanıcı bilgisini doğrula
          try {
            const response = await authAPI.getMe();
            if (response.success && response.user) {
              setUser(response.user);
              localStorage.setItem('user', JSON.stringify(response.user));
            } else {
              // Backend'de kullanıcı bulunamadı, localStorage'ı temizle
              setUser(null);
              localStorage.removeItem('user');
            }
          } catch (error) {
            console.error('Kullanıcı doğrulama hatası:', error);
            // Backend hatası - localStorage'daki kullanıcıyı kullan (offline mod)
          }
        } catch (error) {
          console.error('Kullanıcı bilgisi parse edilemedi:', error);
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(username, password);
      
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Login hatası:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout hatası:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  const isAuthenticated = user !== null;

  const hasAccess = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, hasAccess, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

