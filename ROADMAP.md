# ayraç · Roadmap

Bu dosya, yapılacak geliştirmelerin öncelik sırasına göre listesidir.
Her görev tamamlandığında `[ ]` → `[x]` yapılacak.

---

## 1. Hemen Yapılacaklar

- [x] Yazı boyutları büyütülecek — özellikle kitap listesi ve stat kutucukları
- [x] Açılış sözü — uygulama her açılışta ünlü yazar/şairlerden bir söz gösterecek, tırnak işaretleri içinde, altında isim yazacak

---

## 2. Kitap Ekleme İyileştirmeleri

- [x] **Open Library araması** — kitap adı veya yazar yazınca sonuçlar gelecek, kapak görseli + sayfa sayısı + yazar otomatik dolacak. API: `https://openlibrary.org/search.json`
- [x] **Barkod tarayıcı** — `expo-camera` ile ISBN tarama, bilgiler otomatik gelecek (autofocus + Modal dışı render düzeltmeleriyle)
- [x] **Kamera ile kapak fotoğrafı** — `expo-image-picker` ile kullanıcı kendi kitabının fotoğrafını çekebilecek veya galeriden seçebilecek; 2:3 kırpma adımıyla (`CoverCropper`). Telif sorunu yok çünkü kullanıcının kendi fotoğrafı.

---

## 3. Yeni Özellikler

- [x] **Okunacaklar rafı** — mevcut `reading` ve `finished` durumlarına `want` durumu eklenecek. Kitap listesinde ayrı bir bölüm olarak gösterilecek.

- [x] **Okuma modu**
  - Butona basınca zamanlayıcı arka planda başlar
  - Ekran normal şekilde kararır (telefonu bırakıp fiziksel kitabı okuyorsun)
  - İsteğe bağlı popup: "Telefonunu da sessiz yapmak ister misin?" → evet derse iOS/Android DND ayarına yönlendirir
  - Okuma bitince "Bitti" butonuna basılır, geçen süre kitaba kaydedilir
  - Teknik: `expo-keep-awake` KULLANILMAYACAK, arka plan zamanlayıcısı yeterli

- [x] **Tek kitap paylaşımı**
  - Bir kitabı "Bitti" olarak işaretleyince anında paylaşım seçeneği çıkacak
  - "BİTİRDİM" story kartı (9:16) ve feed kartı (1:1) oluşturulacak
  - Dönem kısıtlaması yok — istediğin kitabı istediğin zaman paylaşabilirsin
  - Tasarım referansı: PDF sayfa 22-24

---

## 4. Wrapped İyileştirmeleri

- [x] Dönem kısıtlaması kaldırılacak — şu an sadece ay/yıl sonu açılıyor, bu kısıtlama gevşetilecek
- [x] Okuma süresi verisi eklenecek — "Bu ay X saat okudun" (okuma modundan beslenecek)
- [x] Tür ve yazar analitiği — "En çok Roman okudun", "Favori yazarın Dostoyevski" gibi kırılımlar eklenecek

---

## 5. Tamamlananlar · Haziran 2026

- [x] **10'luk puanlama sistemi** — 5 yıldız kaldırıldı; 0–10 arası 0.5 adımlı slider
  (canlı serif rakam + haptik tik). Eski veriler ×2 ile güvenli migrate edildi
  (`@ayrac_rating_v2`). Gösterim her yerde "7.5 / 10" serif dizgiyle.
- [x] **Kapak doğrulama + otomatik kapak** — Open Library `cover_i` → ISBN görseli →
  Google Books thumbnail zinciri; otomatik bulunan kapak formda önizlenir,
  "Değiştir" ile fotoğraf/galeri/kapaksız seçilebilir. Manuel eklemede arka plan
  kapak önerisi.
- [x] **5 paylaşım kartı varyantı** — Editöryel · Günlük · Alıntı · İstatistik · Minimal.
  SVG grain dokusu, kelime kırılması koruması (`adjustsFontSizeToFit`), boş alanlar
  gizlenir; Alıntı ve İstatistik veri yoksa seçicide kilitli görünür.
  `Book.quote` alanı eklendi ("Alıntı", maks. 200 karakter).
- [x] **Doğrulanmış alıntı havuzu** — `data/quotes.json`: 35 belgeli alıntı
  (kaynak adıyla) + 18 imzasız ayraç aforizması. Uydurma atıflar tamamen silindi.
  Son 20 alıntı AsyncStorage'da tutulur, tekrar engellenir.
- [x] **Onboarding yeniden tasarımı** — soyut dikdörtgenler yerine gerçek arayüz
  kesitleri: mini kütüphane mock'u, özet (hero + istatistik) kesiti, Editöryel
  paylaşım kartı önizlemesi. Statik, sabit örnek veriyle.
- [x] **Yazar adı temizliği** — `normalizeAuthorName`: "Tolstoy, Leo, graf, 1828-1910"
  → "Leo Tolstoy". Arama, ISBN, öneriler ve mevcut kayıtlar (tek seferlik migration,
  `@ayrac_author_norm_v1`).
- [x] **Pro kilitleri** — öneriler, ısı haritası ve not yazma Free'de
  `ProFeatureGate` ile kilitli (soluk önizleme + paywall); limit bypass'ları kapatıldı.
- [x] **Okuma modu düzeltmeleri** — diyalog kontrastları okunur seviyeye çıkarıldı,
  belirgin "Çık" butonu, net buton etiketleri ("Kaydet ve çık").
- [x] **Klavye düzeltmeleri** — sayı klavyesine "Tamam" çubuğu (`KeyboardDoneBar`),
  kaydırınca/boş alana dokununca kapanma, KAV yapısı düzeltildi (alan klavye altında kalmıyor).
- [x] **Bütünsel tutarlılık geçişi** — `finishedAt` veri modeli (istatistikler bitirme
  tarihiyle), sahte kayıt/giriş yerine tek adımlık isim ekranı + selamlama, ortak
  bileşenler (BookCover/RatingText/PhotoPickerSheet), temaya duyarlı paywall,
  edebi etiketler ("Alıntı", "Notun").

---

## 6. Sıradaki İşler

- [ ] **Kart rötuşları** — 5 varyantın gerçek cihaz Story paylaşımında ince ayarı:
  uzun başlık/alıntı uç durumları, Android gölge kalitesi (ViewShot), renk paleti
  ile varyant zeminlerinin uyumu
- [ ] **Web yayını** — `expo export` ile statik web çıktısı (app.json `web.output:
  "static"` hazır); tanıtım sayfası + tarayıcıda temel kullanım
- [ ] **RevenueCat / IAP entegrasyonu** — gerçek abonelik (₺29,99/ay); "Pro'ya Geç"
  şu an doğrudan Pro yapıyor, paywall'a satın alma/geri yükleme bağlanacak
- [ ] **TestFlight** — EAS Build ile iOS dağıtımı; development build aynı zamanda
  Expo Go kısıtlarını da kaldırır (bildirimler, media library tam erişim)

---

## Free vs Pro Model

### Free
- Toplam 5 kitap limiti
- Temel istatistikler
- Okuma modu
- Son 3 ay okuma geçmişi
- Barkod tarayıcı ile kitap ekleme
- Open Library araması ile kitap ekleme
- ~~Okuma hedefi koyma (sadece sayı görünür)~~ ✓

### Pro (₺29,99/ay)
- Sınırsız kitap
- BİTİRDİM kartı sadece Pro'da (Free'de hiç yok)
- Özelleştirilebilir "BİTİRDİM" kartı — renk, font, animasyon
- Aylık/yıllık Wrapped + paylaşım kartları
- Tüm okuma geçmişi
- Detaylı istatistikler — tür, yazar, okuma hızı kırılımları
- Veri yedekleme — bulutta saklama
- Kişiye özel kitap önerileri
- Dışa aktarma — PDF veya CSV
- Kitap notu yazma (min. 50, max. 280 karakter)
- Geçmiş kitaplara yazılan notlara erişim
- "BİTİRDİM" paylaşımında not — kitap adı + puan (10 üzerinden) + not metni kart varyantlarında
- Streak ısı haritası — yıllık GitHub benzeri görsel
- Ana ekran widget'ı — home screen'de şu an okunan kitap + streak
- Okuma hedefi detayı — haftalık ilerleme grafiği, "hedefe yetişmek için haftada X kitap" hesabı

### Pro'ya geçiş tetikleyicileri
- 5. kitap eklemek istendiğinde
- İlk kitabı bitirince "BİTİRDİM" kartı paylaşmak istediğinde
- Wrapped açılmak istendiğinde
- 3 aydan eski geçmişe bakılmak istendiğinde
- Kitap önerileri bölümüne dokunulduğunda
- Okuma takvimi (ısı haritası) önizlemesine dokunulduğunda
- Kitaba not yazılmak istendiğinde

### Uygulanma durumu
- [x] Toplam 5 kitap limiti (öneri kartından ekleme dahil)
- [x] Öneriler, ısı haritası ve not yazma Free'de `ProFeatureGate` ile kilitli
  (önizleme soluk gösterilir, dokununca paywall açılır)
- [x] 3 aydan eski geçmiş kilidi (kütüphane + wrapped, aylık ve yıllık görünüm)
- [ ] Gerçek ödeme entegrasyonu → bkz. "Sıradaki İşler · RevenueCat"

---

## Faz 2 · Kitap Kulübü (backend gerektirir)

- [ ] Kullanıcı hesapları ve profil sistemi
- [ ] Arkadaş ekleme, birbirinin kitaplığını görme
- [ ] Aynı kitabı okuyanları keşfet
- [ ] Bir kitabı arkadaşa öner
- [ ] Grup okuma hedefi — birlikte kitap okuma

---

## Notlar

- Öncelik sırası yukarıdan aşağıya doğrudur
- Her görev kendi dalında (branch) geliştirilecek
- Tasarım referansı için `ayrac-design.pdf` dosyasına bakılacak
