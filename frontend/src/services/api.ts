import axios from 'axios';
import { Siparis, SiparisDurum, UretimDurum } from '../types';
import { getCached, setCached, invalidateCache } from './cache';

const api = axios.create({
  baseURL: '/api',
});

export const siparisAPI = {
  getAll: async (durum?: string): Promise<Siparis[]> => {
    const cacheKey = `siparisler-${durum || 'all'}`;
    const cached = getCached<Siparis[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const { data } = await api.get('/siparisler', { params: { durum } });
    setCached(cacheKey, data);
    return data;
  },

  getById: async (id: number): Promise<Siparis> => {
    const { data } = await api.get(`/siparisler/${id}`);
    return data;
  },

  updateDurum: async (id: number, durum: SiparisDurum): Promise<Siparis> => {
    const { data } = await api.patch(`/siparisler/${id}/durum`, { durum });
    invalidateCache('siparisler'); // Clear cache after update
    return data;
  },

  updateUretimDurum: async (id: number, uretimDurum: UretimDurum): Promise<Siparis> => {
    const { data } = await api.patch(`/siparisler/${id}/uretim-durum`, { uretimDurum });
    invalidateCache('siparisler'); // Clear cache after update
    return data;
  },

  updateNot: async (id: number, not: string): Promise<Siparis> => {
    const { data } = await api.patch(`/siparisler/${id}/not`, { not });
    invalidateCache('siparisler'); // Clear cache after update
    return data;
  },

  create: async (siparis: Partial<Siparis>): Promise<Siparis> => {
    const { data } = await api.post('/siparisler', siparis);
    invalidateCache('siparisler'); // Clear cache after create
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/siparisler/${id}`);
    invalidateCache('siparisler'); // Clear cache after delete
  },
};

export const raporAPI = {
  getRaporlar: async (baslangic?: string, bitis?: string) => {
    const cacheKey = `raporlar-${baslangic || 'all'}-${bitis || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
    
    const { data } = await api.get('/raporlar', { params: { baslangic, bitis } });
    setCached(cacheKey, data);
    return data;
  },
};

export const fotoğrafAPI = {
  updateFotograflar: async () => {
    const { data } = await api.post('/siparisler/update-fotograflar');
    return data;
  },
  refreshFotograf: async (id: number) => {
    const { data } = await api.post(`/siparisler/${id}/refresh-fotograf`);
    invalidateCache('siparisler'); // Clear cache after refresh
    return data;
  },
};

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    role: 'operasyon' | 'atolye' | 'yonetici';
  };
  error?: string;
}

export interface User {
  id: string;
  username: string;
  role: 'operasyon' | 'atolye' | 'yonetici';
  created_at?: string;
  updated_at?: string;
}

export interface UsersResponse {
  success: boolean;
  users?: User[];
  error?: string;
}

export interface UserResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export const authAPI = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/login', { username, password });
    return data;
  },

  getMe: async (): Promise<LoginResponse> => {
    const userId = localStorage.getItem('user') 
      ? JSON.parse(localStorage.getItem('user')!).id 
      : null;
    
    if (!userId) {
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }

    const { data } = await api.get('/auth/me', {
      headers: {
        'x-user-id': userId,
      },
    });
    return data;
  },

  logout: async (): Promise<{ success: boolean }> => {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  // Kullanıcı yönetimi (sadece yönetici)
  getUsers: async (): Promise<UsersResponse> => {
    const { data } = await api.get('/auth/users');
    return data;
  },

  createUser: async (username: string, password: string, role: 'operasyon' | 'atolye' | 'yonetici'): Promise<UserResponse> => {
    const { data } = await api.post('/auth/users', { username, password, role });
    return data;
  },

  updateUser: async (id: string, updates: { username?: string; password?: string; role?: 'operasyon' | 'atolye' | 'yonetici' }): Promise<UserResponse> => {
    const { data } = await api.put(`/auth/users/${id}`, updates);
    return data;
  },

  deleteUser: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { data } = await api.delete(`/auth/users/${id}`);
    return data;
  },
};
