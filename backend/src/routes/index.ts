import { Express } from 'express';
import siparisRoutes from './siparis.routes.js';
import raporRoutes from './rapor.routes.js';

export function setupRoutes(app: Express) {
  // Health check endpoint - Railway için kritik
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      message: 'Sipariş Takip API çalışıyor',
      timestamp: new Date().toISOString()
    });
  });

  // Manuel Trendyol sync test endpoint'i
  app.post('/api/test/trendyol-sync', async (req, res) => {
    try {
      const { fetchTrendyolSiparisler } = await import('../services/trendyolSync.js');
      const siparisler = await fetchTrendyolSiparisler();
      res.json({ 
        success: true, 
        siparisSayisi: siparisler.length,
        siparisler: siparisler.slice(0, 3) // İlk 3 siparişi göster
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      });
    }
  });

  app.use('/api/siparisler', siparisRoutes);
  app.use('/api/raporlar', raporRoutes);
}
