# GraphQL API Kullanımı - En İyi Uygulamalar

Bu dokümantasyon, gelecekte GraphQL API hatalarını önlemek için yapılması gerekenleri açıklar.

## 🚨 Önemli Kurallar

### 1. GraphQL Query'lerini Değiştirmeden Önce Test Edin

GraphQL query'lerini değiştirmeden önce **mutlaka test edin**:

```bash
cd backend
npm run test:graphql
```

Bu script GraphQL query'nizi test eder ve hataları gösterir.

### 2. API Dokümantasyonunu Kontrol Edin

GraphQL query'lerini değiştirmeden önce:
- ✅ Ikas API dokümantasyonunu kontrol edin
- ✅ Hangi alanların mevcut olduğunu doğrulayın
- ✅ Hangi alanların subfield gerektirdiğini öğrenin

### 3. GraphQL Hatalarını Dikkatlice Okuyun

GraphQL hataları çok açıklayıcıdır:
- `Cannot query field "X" on type "Y"` → Alan mevcut değil veya yanlış tip
- `Field "X" must have a selection of subfields` → Subfield seçimi gerekiyor
- `Did you mean "Z"?` → Önerilen alan adı

### 4. Değişiklik Yapmadan Önce

1. **Local'de test edin**: `npm run dev` ile local'de çalıştırın
2. **GraphQL test scripti çalıştırın**: `npm run test:graphql`
3. **Logları kontrol edin**: Railway loglarında GraphQL hatalarını kontrol edin
4. **Küçük değişiklikler yapın**: Bir seferde çok fazla değişiklik yapmayın

### 5. Error Handling

GraphQL hataları yakalandığında:
- ✅ Detaylı loglama yapın (satır, sütun, mesaj)
- ✅ Crash'i önlemek için boş array döndürün
- ✅ Hataları Railway loglarında kontrol edin

## 📝 Örnek GraphQL Hataları ve Çözümleri

### Hata 1: `Cannot query field "id" on type "OrderLineOption"`

**Sorun**: `OrderLineOption` tipinde `id` alanı yok.

**Çözüm**: `id` alanını kaldırın veya doğru tipi kullanın.

```graphql
# ❌ Yanlış
options {
  id
  name
}

# ✅ Doğru
options {
  name
  type
}
```

### Hata 2: `Field "values" must have a selection of subfields`

**Sorun**: `values` alanı bir array tipi ve subfield seçimi gerekiyor.

**Çözüm**: Subfield seçimi yapın veya alanı kaldırın.

```graphql
# ❌ Yanlış
options {
  values
}

# ✅ Doğru (eğer subfield varsa)
options {
  values {
    value
  }
}

# ✅ Doğru (eğer subfield yoksa)
options {
  name
  type
}
```

### Hata 3: `Did you mean "values" or "name"?`

**Sorun**: Alan adı yanlış yazılmış.

**Çözüm**: Önerilen alan adını kullanın.

```graphql
# ❌ Yanlış
options {
  value
}

# ✅ Doğru
options {
  values {
    value
  }
}
```

## 🔍 GraphQL Query Test Etme

### Test Script Kullanımı

```bash
cd backend
npm run test:graphql
```

Bu script:
- ✅ Token alır
- ✅ GraphQL query'yi test eder
- ✅ Hataları gösterir
- ✅ Başarılı olup olmadığını bildirir

### Manuel Test

1. Ikas API GraphQL endpoint'ine gidin
2. Query'nizi test edin
3. Hataları kontrol edin
4. Düzeltmeleri yapın

## 📚 Kaynaklar

- [Ikas API Dokümantasyonu](https://developer.ikas.com/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [GraphQL Error Handling](https://graphql.org/learn/validation/)

## ⚠️ Deployment Öncesi Kontrol Listesi

- [ ] GraphQL query'lerini test ettiniz mi?
- [ ] API dokümantasyonunu kontrol ettiniz mi?
- [ ] Local'de test ettiniz mi?
- [ ] Error handling doğru mu?
- [ ] Loglama yeterli mi?
- [ ] Crash önleme mekanizması var mı?

## 🛠️ Sorun Giderme

### GraphQL Hatası Alıyorsanız

1. **Hata mesajını okuyun**: GraphQL hataları çok açıklayıcıdır
2. **Satır ve sütun numaralarını kontrol edin**: Hatanın nerede olduğunu gösterir
3. **API dokümantasyonunu kontrol edin**: Doğru alan adlarını öğrenin
4. **Test scripti çalıştırın**: Query'nizi test edin
5. **Küçük değişiklikler yapın**: Bir seferde çok fazla değişiklik yapmayın

### Deployment Crash Oluyorsa

1. **Railway loglarını kontrol edin**: GraphQL hatalarını görebilirsiniz
2. **Error handling'i kontrol edin**: Hatalar yakalanıyor mu?
3. **Crash önleme mekanizması var mı?**: Boş array döndürülüyor mu?
4. **Local'de test edin**: Sorunları önceden yakalayın

