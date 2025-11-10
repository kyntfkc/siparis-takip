import { Router } from 'express';
import { getRaporlar } from '../database/db.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 GET /api/raporlar çağrıldı, query:', req.query);
    }
    const { baslangic, bitis } = req.query;
    
    let raporlar: any[] = [];
    try {
      raporlar = getRaporlar(
        baslangic as string | undefined,
        bitis as string | undefined
      );
      
      if (!Array.isArray(raporlar)) {
        console.error('❌ getRaporlar array döndürmedi:', typeof raporlar);
        raporlar = [];
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Raporlar getirildi:', raporlar.length);
      }
      res.json(raporlar);
    } catch (getRaporlarError: any) {
      console.error('❌ getRaporlar hatası:', getRaporlarError.message);
      console.error('❌ getRaporlar stack:', getRaporlarError.stack);
      res.status(500).json({ 
        error: getRaporlarError?.message || 'Raporlar getirilemedi',
        stack: process.env.NODE_ENV === 'development' ? getRaporlarError?.stack : undefined
      });
    }
  } catch (error: any) {
    console.error('❌ Route handler hatası:', error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    res.status(500).json({ 
      error: error?.message || 'Raporlar getirilemedi',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

export default router;
