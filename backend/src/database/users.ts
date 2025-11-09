import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export type UserRole = 'operasyon' | 'atolye' | 'yonetici';

export interface User {
  id: string;
  username: string;
  password: string; // Hash'lenmiş olmalı (production'da bcrypt kullanılmalı)
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

interface UsersDatabase {
  users: User[];
}

// Railway Volume için path ayarla
const usersDbPath = process.env.USERS_DATABASE_PATH || 
  (process.env.DATABASE_PATH 
    ? join(dirname(process.env.DATABASE_PATH), 'users.json')
    : join(process.cwd(), 'users.json'));

// Database dizinini otomatik oluştur
const dbDir = dirname(usersDbPath);
if (!existsSync(dbDir)) {
  try {
    mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Users database dizini oluşturuldu: ${dbDir}`);
  } catch (err: any) {
    console.error(`❌ Users database dizini oluşturulamadı: ${err.message}`);
  }
}

let usersDb: UsersDatabase = {
  users: [],
};

// Basit hash fonksiyonu (production'da bcrypt kullanılmalı)
function simpleHash(password: string): string {
  // Bu sadece demo için - production'da bcrypt kullanılmalı
  return Buffer.from(password).toString('base64');
}

// Database'i yükle
function loadUsersDatabase(): void {
  try {
    if (existsSync(usersDbPath)) {
      const data = readFileSync(usersDbPath, 'utf-8');
      usersDb = JSON.parse(data);
      console.log(`✅ Users database yüklendi, ${usersDb.users.length} kullanıcı bulundu`);
    } else {
      // İlk çalıştırmada demo kullanıcıları oluştur
      initializeDemoUsers();
    }
  } catch (error: any) {
    console.error('❌ Users database yüklenemedi:', error.message);
    usersDb = { users: [] };
    initializeDemoUsers();
  }
}

// Demo kullanıcıları oluştur
function initializeDemoUsers(): void {
  const demoUsers: User[] = [
    {
      id: '1',
      username: 'operasyon',
      password: simpleHash('operasyon123'),
      role: 'operasyon',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      username: 'atolye',
      password: simpleHash('atolye123'),
      role: 'atolye',
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      username: 'yonetici',
      password: simpleHash('yonetici123'),
      role: 'yonetici',
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      username: 'admin',
      password: simpleHash('admin123'),
      role: 'yonetici',
      created_at: new Date().toISOString(),
    },
  ];

  usersDb.users = demoUsers;
  saveUsersDatabase();
  console.log('✅ Demo kullanıcılar oluşturuldu');
}

// Database'i kaydet
function saveUsersDatabase(): void {
  try {
    writeFileSync(usersDbPath, JSON.stringify(usersDb, null, 2), 'utf-8');
  } catch (error: any) {
    console.error('❌ Users database kaydedilemedi:', error.message);
  }
}

// Kullanıcıyı kullanıcı adına göre bul
export function findUserByUsername(username: string): User | null {
  return usersDb.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

// Kullanıcıyı ID'ye göre bul
export function findUserById(id: string): User | null {
  return usersDb.users.find(u => u.id === id) || null;
}

// Kullanıcı doğrulama
export function verifyUser(username: string, password: string): User | null {
  const user = findUserByUsername(username);
  if (!user) {
    return null;
  }

  const hashedPassword = simpleHash(password);
  if (user.password === hashedPassword) {
    // Şifreyi response'dan çıkar
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  return null;
}

// Tüm kullanıcıları getir (sadece yönetici için)
export function getAllUsers(): Omit<User, 'password'>[] {
  return usersDb.users.map(({ password, ...user }) => user);
}

// Yeni kullanıcı oluştur
export function createUser(username: string, password: string, role: UserRole): Omit<User, 'password'> {
  // Kullanıcı adı kontrolü
  if (findUserByUsername(username)) {
    throw new Error('Bu kullanıcı adı zaten kullanılıyor');
  }

  const newId = String(Math.max(...usersDb.users.map(u => parseInt(u.id) || 0), 0) + 1);
  const newUser: User = {
    id: newId,
    username,
    password: simpleHash(password),
    role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  usersDb.users.push(newUser);
  saveUsersDatabase();

  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

// Kullanıcı güncelle
export function updateUser(id: string, updates: { username?: string; password?: string; role?: UserRole }): Omit<User, 'password'> {
  const userIndex = usersDb.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    throw new Error('Kullanıcı bulunamadı');
  }

  const user = usersDb.users[userIndex];

  // Kullanıcı adı değişiyorsa kontrol et
  if (updates.username && updates.username !== user.username) {
    if (findUserByUsername(updates.username)) {
      throw new Error('Bu kullanıcı adı zaten kullanılıyor');
    }
    user.username = updates.username;
  }

  if (updates.password) {
    user.password = simpleHash(updates.password);
  }

  if (updates.role) {
    user.role = updates.role;
  }

  user.updated_at = new Date().toISOString();
  saveUsersDatabase();

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Kullanıcı sil
export function deleteUser(id: string): void {
  const userIndex = usersDb.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    throw new Error('Kullanıcı bulunamadı');
  }

  usersDb.users.splice(userIndex, 1);
  saveUsersDatabase();
}

// Database'i başlat
export function initUsersDatabase(): void {
  loadUsersDatabase();
}

// İlk çalıştırmada database'i başlat
initUsersDatabase();

