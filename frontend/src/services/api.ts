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
