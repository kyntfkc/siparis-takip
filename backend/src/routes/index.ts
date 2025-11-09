import { Express } from 'express';
import siparisRoutes from './siparis.routes.js';
import raporRoutes from './rapor.routes.js';
import authRoutes from './auth.routes.js';

export function setupRoutes(app: Express) {
  // Health check endpoint - Railway için kritik
  // Bu endpoint en başta olmalı, diğer route'lardan önce
  app.get('/api/health', (req, res) => {
    console.log('🏥 Health check endpoint çağrıldı');
    try {
      const response = { 
        status: 'ok', 
        message: 'Sipariş Takip API çalışıyor',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
      console.log('✅ Health check response:', response);
      res.status(200).json(response);
    } catch (error: any) {
      console.error('❌ Health check hatası:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error.message 
      });
    }
  });

  // IP adresi öğrenme endpoint'i (Trendyol whitelist için)
  app.get('/api/ip', (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (forwarded as string).split(',')[0] : req.socket.remoteAddress;
    res.json({
      ip,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'cf-connecting-ip': req.headers['cf-connecting-ip']
      }
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

  // Trendyol Webhook endpoint'i
  app.post('/api/webhook/trendyol', async (req, res) => {
    try {
      console.log('📨 Trendyol webhook alındı:', JSON.stringify(req.body).substring(0, 200));
      
      // Webhook'u hemen kabul et (Trendyol timeout'u önlemek için)
      res.status(200).json({ success: true, message: 'Webhook alındı' });
      
      // Sipariş işleme (async olarak devam et)
      setImmediate(async () => {
        try {
          const { processTrendyolWebhook } = await import('../services/trendyolSync.js');
          await processTrendyolWebhook(req.body);
        } catch (error: any) {
          console.error('❌ Webhook işleme hatası:', error.message);
        }
      });
    } catch (error: any) {
      console.error('❌ Webhook hatası:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/siparisler', siparisRoutes);
  app.use('/api/raporlar', raporRoutes);
}
