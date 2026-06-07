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
- [x] **Barkod tarayıcı** — `expo-barcode-scanner` ile ISBN tarama, bilgiler otomatik gelecek
- [x] **Kamera ile kapak fotoğrafı** — `expo-image-picker` ile kullanıcı kendi kitabının fotoğrafını çekebilecek veya galeriden seçebilecek. Telif sorunu yok çünkü kullanıcının kendi fotoğrafı.

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

## Free vs Pro Model

### Free
- Aylık 5 kitap limiti
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
- Kitap düşüncesi / inceleme yazma (min. 50, max. 280 karakter)
- Geçmiş kitaplara yazılan düşüncelere erişim
- "BİTİRDİM" paylaşımında düşünce kartı — kitap adı + yıldız + düşünce metni story formatında
- Streak ısı haritası — yıllık GitHub benzeri görsel
- Ana ekran widget'ı — home screen'de şu an okunan kitap + streak
- Okuma hedefi detayı — haftalık ilerleme grafiği, "hedefe yetişmek için haftada X kitap" hesabı

### Pro'ya geçiş tetikleyicileri
- 5. kitap eklemek istendiğinde
- İlk kitabı bitirince "BİTİRDİM" kartı paylaşmak istediğinde
- Wrapped açılmak istendiğinde
- 3 aydan eski geçmişe bakılmak istendiğinde

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
