import { Router, Request, Response } from 'express';
import { verifyUser, findUserById, getAllUsers, createUser, updateUser, deleteUser, UserRole } from '../database/users.js';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı adı ve şifre gereklidir',
      });
    }

    const user = verifyUser(username, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Kullanıcı adı veya şifre hatalı',
      });
    }

    // Şifreyi response'dan çıkar
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('❌ Login hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Giriş yapılırken bir hata oluştu',
    });
  }
});

// Kullanıcı bilgisi endpoint'i (token/session kontrolü için)
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Basit session kontrolü - header'dan kullanıcı ID'si al
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Oturum bulunamadı',
      });
    }

    const user = findUserById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    // Şifreyi response'dan çıkar
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('❌ Kullanıcı bilgisi hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Kullanıcı bilgisi alınırken bir hata oluştu',
    });
  }
});

// Logout endpoint (frontend'de localStorage temizlenecek)
router.post('/logout', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Çıkış yapıldı',
    });
  } catch (error: any) {
    console.error('❌ Logout hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Çıkış yapılırken bir hata oluştu',
    });
  }
});

// Tüm kullanıcıları getir (sadece yönetici)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = getAllUsers();
    res.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error('❌ Kullanıcı listesi hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Kullanıcı listesi alınırken bir hata oluştu',
    });
  }
});

// Yeni kullanıcı oluştur (sadece yönetici)
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı adı, şifre ve rol gereklidir',
      });
    }

    if (!['operasyon', 'atolye', 'yonetici'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz rol',
      });
    }

    const user = createUser(username, password, role as UserRole);
    res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('❌ Kullanıcı oluşturma hatası:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Kullanıcı oluşturulurken bir hata oluştu',
    });
  }
});

// Kullanıcı güncelle (sadece yönetici)
router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    const updates: { username?: string; password?: string; role?: UserRole } = {};
    if (username) updates.username = username;
    if (password) updates.password = password;
    if (role) {
      if (!['operasyon', 'atolye', 'yonetici'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Geçersiz rol',
        });
      }
      updates.role = role as UserRole;
    }

    const user = updateUser(id, updates);
    res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('❌ Kullanıcı güncelleme hatası:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Kullanıcı güncellenirken bir hata oluştu',
    });
  }
});

// Kullanıcı sil (sadece yönetici)
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    deleteUser(id);
    res.json({
      success: true,
      message: 'Kullanıcı silindi',
    });
  } catch (error: any) {
    console.error('❌ Kullanıcı silme hatası:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Kullanıcı silinirken bir hata oluştu',
    });
  }
});

export default router;

