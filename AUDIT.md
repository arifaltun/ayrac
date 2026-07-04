# ayraç · Bütünsel Kullanıcı Deneyimi Denetimi

_Tarih: 4 Temmuz 2026 · Yöntem: tüm akışların kod üzerinden zihinsel yürüyüşü (onboarding → ekleme → düzenleme → okuma modu → hedef → özet → paylaşım → ayarlar → Free/Pro). Kod değişikliği yapılmadı._

## Yönetici Özeti

- **Toplam madde: 57** — Kritik: **7** · Orta: **28** · Küçük: **22**
- **Güncelleme (4 Temmuz 2026, 2. tur):** Erişilebilirlik süpürmesi, sürtünme maddeleri, hata mesajları bloğu ve kod sağlığı/performans turu tamamlandı. **51 madde düzeltildi**; kalan **6 açık madde**: kapakların çevrimdışı önbelleklenmesi (Orta) ile 5 küçük madde (splash açık tema zemini, ortak `FormSheet`, ortak `usePeriod`, ısı haritası yıl hizası, Free limitinin "Okuyacağım" rafını sayması — ürün kararı bekliyor).
- **En çok sorun biriken üç alan (ilk denetimde):**
  1. **Paylaşım kartları & ViewShot çıktısı** (10 madde) — tamamı düzeltildi.
  2. **Erişilebilirlik** (11 madde) — tamamı düzeltildi; `mutedStrong` metinden yasaklandı, koyu tema `muted` AA seviyesine çekildi.
  3. **Barkod / kamera akışı** (8 madde) — tamamı düzeltildi (hata görünürlüğü, cooldown, izin çıkmazı, fener).
- **Monetizasyon tutarsızlığı:** giderildi — Wrapped/dışa aktarma tetiklere bağlandı, `share-book` kapıyı hedefte de kontrol ediyor.
- **Olumlu:** Boş/verisiz durumlar paylaşım kartlarında zarif çözülmüş ("—" yok, alanlar gizleniyor, varyant kilitleniyor); `BookCover`/`ScalePressable`/`RatingText` ortak bileşen disiplini tutarlı; migration'lar bayrak korumalı ve güvenli.

---

## 1 · Açılış & Onboarding

- ✅ **[Orta — düzeltildi]** Splash · `app/splash.tsx` — Her açılışta 2.5–6 sn zorunlu bekleme var, dokunarak geçilebildiği hiçbir yerde söylenmiyordu. → Alıntının altına soluk "dokun ve geç" ipucu eklendi.
- ✅ **[Küçük — düzeltildi]** Splash · `app/splash.tsx` — `@ayrac_has_entered` async okunmadan dokunan dönen kullanıcı onboarding'e düşüyordu (yarış). → Hedef çözülene dek dokunma pasif.
- ✅ **[Orta — düzeltildi]** Splash · `app/splash.tsx` — Tüm ekran `Pressable` ama etiket/rol yoktu. → "Devam et" etiketi + buton rolü + ipucu eklendi.
- ✅ **[Küçük — düzeltildi]** Onboarding · `app/(onboarding)/index.tsx` — "Geç" ~32pt ve rolsüzdü. → 44pt hedef + "Tanıtımı geç" etiketi; Devam/Başla butonu da etiketlendi.
- ✅ **[Küçük — düzeltildi]** Onboarding · `app/(onboarding)/index.tsx` — Slayt genişliği modül yüklenirken sabitleniyordu; iPad boyut değişiminde sayfalama bozulurdu. → `useWindowDimensions`.
- **[Küçük]** Onboarding/Splash · `app/splash.tsx`, `app/(onboarding)/index.tsx` — Açık tema kullanıcısı için de zorla siyah zemin; ayarlardan açık temaya geçen kullanıcı her açılışta koyu→açık sıçrama yaşar. → Bilinçli marka kararıysa geçişi fade ile yumuşat, değilse tema token'larına bağla.
- ✅ **[Küçük — düzeltildi]** İsim ekranı · `app/(onboarding)/name.tsx` — İsim boşken "Başla" ile "İsimsiz devam et" birebir aynı işi yapıyordu. → İsim boşken "Başla" pasif. (Ekran ölü `(auth)` grubundan `(onboarding)/name`'e taşındı, grup silindi.)
- ✅ **[Orta — düzeltildi]** İsim ekranı · `app/(onboarding)/name.tsx` + `constants/tokens.ts` — "İsimsiz devam et" koyu temada `mutedStrong` (0.18 alfa, ~1.6:1) ile pratikte görünmezdi. → Metin `muted`'a alındı; koyu tema `muted` 0.50'ye (~4.9:1, WCAG AA) yükseltildi, `mutedStrong` 0.35'e çekilip token dosyasında metin için yasak notu düşüldü.

## 2 · Kitap Ekleme — Arama / Barkod / Manuel

- ✅ **[Kritik — düzeltildi]** Barkod · `app/(app)/add-book.tsx` — Hata metni tarayıcı overlay'inin altında kalıyordu. → Hata banner'ı overlay'in içinde gösteriliyor.
- ✅ **[Kritik — düzeltildi]** Barkod · `app/(app)/add-book.tsx` — Başarısız taramada sonsuz yeniden-tarama döngüsü. → Aynı ISBN için 3 sn cooldown.
- ✅ **[Orta — düzeltildi]** Barkod · `app/(app)/add-book.tsx` — Kamera izni kalıcı reddedilmişse çıkmaz sokaktı. → Ortak `permissionDeniedAlert` (utils/permissionAlert.ts) ile "Ayarları aç" yolu.
- ✅ **[Orta — düzeltildi]** Barkod · `app/(app)/add-book.tsx` — Fener kontrolü yoktu. → Overlay'e `enableTorch` bağlı fener aç/kapa butonu eklendi.
- ✅ **[Orta — düzeltildi]** Barkod · `app/(app)/add-book.tsx` — VoiceOver odağı alttaki formda kalabiliyordu. → Overlay açıkken sheet'e `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"`.
- ✅ **[Orta — düzeltildi]** Arama · `app/(app)/add-book.tsx` — Ağ hatası sessizce boş sonuç gibi görünüyordu. → "Sonuç bulunamadı" ile "Aramaya ulaşılamadı" ayrı tek satırlık durum mesajları.
- ✅ **[Orta — düzeltildi]** Arama · `app/(app)/add-book.tsx` — `fetch` timeout'suzdu. → Tüm istekler `AbortController` ile 8 sn timeout'lu (`fetchWithTimeout`).
- ✅ **[Orta — düzeltildi]** Form · `app/(app)/add-book.tsx` — Backdrop/kapat doldurulmuş formu onaysız siliyordu. → Kirli formda "Değişiklikler kaydedilmedi" onayı.
- ✅ **[Orta — düzeltildi]** Form · `app/(app)/add-book.tsx` — Sınırdaki Free kullanıcı formu doldurup sonda paywall'a çarpıyordu. → Sheet açılışında sınır banner'ı gösteriliyor.
- ✅ **[Orta — düzeltildi]** Form · `app/(app)/add-book.tsx` — Barkod butonu etiketsizdi. → "Barkod tara" etiketi + rol.
- ✅ **[Küçük — düzeltildi]** Form · `app/(app)/add-book.tsx` — Kapat butonu etiketsizdi. → `hitSlop` + "Kapat" etiketi (edit-book ile tutarlı).
- ✅ **[Küçük — düzeltildi]** Form · `app/(app)/add-book.tsx` — `setCoverImage` updater'ı içinde yan etki vardı. → İki set updater dışında koşullu yapılıyor.
- ✅ **[Küçük — düzeltildi]** Form · `app/(app)/add-book.tsx` — Buton neden pasif söylenmiyordu. → "Eklemek için yazar alanını da doldur" ipucu.
- ✅ **[Küçük — düzeltildi]** Form · `app/(app)/add-book.tsx` — Tür serbest metin, aynı tür ayrı sayılıyordu. → Kaydederken `normalizeGenre` (utils/genre.ts) ile kırp + Türkçe baş harf.
- ✅ **[Küçük — düzeltildi]** Fotoğraf · `components/PhotoPickerSheet.tsx`, `components/CoverCropper.tsx` — Üretimde `console.log` kalıyordu. → `__DEV__` korumalı `dlog`'a alındı.
- ✅ **[Küçük — düzeltildi]** Kırpma · `components/CoverCropper.tsx` — Kırpma yalnızca jestle yapılabiliyordu. → "Kırpmadan kullan" düğmesi eklendi.

## 3 · Kitap Düzenleme

- ✅ **[Kritik — düzeltildi]** Not · `app/(app)/edit-book.tsx` — 50 karakter altı not sessizce eski nota dönüyordu. → Boş → silinir, doluysa aynen kaydedilir.
- ✅ **[Orta — düzeltildi]** Durum · `app/(app)/edit-book.tsx` — "Bitti"den çıkış puanı ve `finishedAt`i uyarısız sıfırlıyordu. → "Durum değişiyor" onayı soruluyor.
- ✅ **[Orta — düzeltildi]** Navigasyon · `app/(app)/edit-book.tsx` — Aynı frame'de back+push yarışı vardı. → Kaydetme navigasyonsuz `persist()`'e ayrıldı, okuma moduna tek `router.replace`.
- ✅ **[Orta — düzeltildi]** Sheet · `app/(app)/edit-book.tsx` — Backdrop dokununca kapanmıyordu (add-book ile tutarsız). → Backdrop `Pressable`; kirli form onayıyla kapanıyor.
- ✅ **[Orta — düzeltildi]** Sheet · `app/(app)/edit-book.tsx` — Kapatınca değişiklikler onaysız kayboluyordu. → Kirli form kontrolü + onay.
- **[Küçük]** Tutarlılık · `add-book.tsx` vs `edit-book.tsx` — Sheet üst boşluğu 80/90, backdrop opaklığı, gölge, buton dolgusu farklı — aynı desenin iki el işi kopyası. → Ortak `FormSheet` bileşenine çıkar.
- ✅ **[Küçük — düzeltildi]** Tema · `app/(app)/edit-book.tsx` — "Okuma modunu başlat" `#000`/`#333` sabitti. → Bilinçli karar olarak yorumla işaretlendi (okuma modu her temada koyu; buton ona açılan kapı).
- ✅ **[Küçük — düzeltildi]** Alıntı · `app/(app)/edit-book.tsx` — Alıntı yalnız "Bitti"de girilebiliyordu. → "Okunuyor" durumunda da açık.

## 4 · Okuma Modu

- ✅ **[Kritik — düzeltildi]** Oturum kaybı · `app/(app)/reading-mode.tsx` — Oturum yalnız bellekteydi. → AsyncStorage izi + açılışta kurtarma önerisi.
- ✅ **[Kritik — düzeltildi]** Store riski · `app/(app)/reading-mode.tsx` — `App-Prefs:` özel URL şeması. → Yönlendirmesiz nötr öneri metnine çevrildi.
- ✅ **[Orta — düzeltildi]** Sessiz önerisi · `app/(app)/reading-mode.tsx` — Popup her oturumda çıkıyordu. → Bir kez gösterilip `@ayrac_silent_prompt_seen` ile hatırlanıyor.
- ✅ **[Orta — düzeltildi]** Çıkış · `app/(app)/reading-mode.tsx` — Kaydetmeden atma seçeneği yoktu. → Onay diyaloğuna sessiz "Kaydetmeden çık" bağlantısı.
- ✅ **[Orta — düzeltildi]** Android geri · `app/(app)/reading-mode.tsx` — Donanım geri tuşu onaysız kapatıyordu. → `beforeRemove` ile onay diyaloğuna bağlandı.
- ✅ **[Küçük — düzeltildi]** Veri kirliliği · `app/(app)/reading-mode.tsx` — 1-2 saniyelik kazara oturumlar kaydediliyordu. → 60 sn altı kaydedilmiyor; diyalog bunu söylüyor.

## 5 · Kütüphane, Hedefler & Ayarlar

- ✅ **[Orta — düzeltildi]** Hatırlatıcı · `library.tsx` — İzin reddinde modal sessizce kapanıyordu. → "Ayarları aç" seçenekli uyarı; anahtar kapalı kalıyor.
- ✅ **[Orta — düzeltildi]** Bildirim · `utils/notifications.ts` — Android bildirim kanalı oluşturulmuyordu. → Zamanlama öncesi `setNotificationChannelAsync` + trigger'da `channelId`.
- ✅ **[Küçük — düzeltildi]** Bildirim içeriği · `utils/notifications.ts` — Donmuş seri sayısı/kitap adı zamanla yalan söylüyordu. → İçerik nötr metne çevrildi; bayatlayan bilgiler kaldırıldı.
- ✅ **[Orta — düzeltildi]** Veri silme · `library.tsx` — Hedefler, isim ve kurulu bildirim kalıyordu. → Sıfırlama artık hedef/isim/bildirim/yarım oturum izini de temizliyor; onay metni güncellendi.
- ✅ **[Orta — düzeltildi]** Hedef · `library.tsx` — Modal metni döneme özel söz veriyordu ama hedef global. → "Her ay/yıl için hedefin" metni.
- ✅ **[Küçük — düzeltildi]** Hedef · `library.tsx` — Geçersiz/0 girişi hedefi sessizce kaldırıyordu. → Satır içi hata gösteriliyor; kaldırma yalnız "Kaldır"da.
- ✅ **[Orta — düzeltildi]** Erişilebilirlik · `library.tsx` — 44pt altı hedef kümesi (ayar/bildirim ikonları, Aylık/Yıllık anahtarı, öneri ekle, not kalemi). → `hitSlop` + etiket/rol/durum eklendi (wrapped'taki anahtar dahil).
- ✅ **[Orta — düzeltildi]** Kontrast · `library.tsx` — Not gövdesi `mutedStrong` ile okunmazdı. → `muted` (AA) kullanılıyor.
- ✅ **[Orta — düzeltildi]** Performans · `library.tsx` — `ScrollView` + `map`, memo'suz `BookRow`. → `FlatList` + `React.memo(BookRow)`.
- ✅ **[Orta — düzeltildi]** Navigasyon · `components/ui/BottomNav.tsx` — Sekmeler `router.push` ile yığın biriktiriyordu. → `router.replace`.
- ✅ **[Küçük — düzeltildi]** Performans · `library.tsx` — Filtre/istatistikler her render'da hesaplanıyordu. → `useMemo`.
- ✅ **[Küçük — düzeltildi]** Sessizlik ilkesi · `library.tsx` — 3. kitaptan itibaren kalıcı Pro banner'ı. → Yalnız 5/5 sınırında görünüyor.
- ✅ **[Küçük — düzeltildi]** Öneriler · `library.tsx` — İstek düşünce bölüm sessizce yok oluyordu. → "Öneriler yüklenemedi · Tekrar dene" satırı.
- ✅ **[Küçük — düzeltildi]** Kopya · `library.tsx` + `context/ProContext.tsx` — Fiyat iki yerde elle yazılıydı. → `PRO_PRICE_LABEL` sabiti.

## 6 · Özet (Wrapped)

- ✅ **[Kritik — düzeltildi]** Pro sızıntısı · `wrapped.tsx` — "Okunan kitaplar" satırı paywall'ı atlıyordu. → `isPro` kontrolü + `showPaywall('bitirdim_card')`.
- ✅ **[Kritik — düzeltildi]** Pro sızıntısı · `wrapped.tsx` + `ProContext.tsx` — Wrapped ve PDF/CSV kapısızdı. → Yıllık görünüm `wrapped`, dışa aktarma `export` tetiğine bağlandı.
- ✅ **[Orta — düzeltildi]** Isı haritası · `wrapped.tsx` — Grid bir yıl öncesinde açılıyordu. → Açılışta `scrollToEnd` (bugün görünür).
- ✅ **[Orta — düzeltildi]** Isı haritası · `wrapped.tsx` — 364 hücre her render'da kuruluyordu; kilitli önizleme bile tam grid'di. → `ReadingHeatmap` `React.memo`; Free önizlemesi statik `HeatmapPlaceholder`.
- ✅ **[Orta — düzeltildi]** Dışa aktarma · `wrapped.tsx` — CSV/PDF hatası `console.warn`'a gidiyordu. → Kullanıcıya kısa uyarı gösteriliyor.
- **[Küçük]** Isı haritası · `wrapped.tsx` — Grid daima "son 52 hafta"; dönem gezgini ile çelişiyor. → Seçili yıla hizala veya kartı dönem navigasyonundan bağımsız olduğunu belirterek en alta sabitle.
- ✅ **[Küçük — düzeltildi]** Boş durum · `wrapped.tsx` — Eylem butonu yoktu. → "Kitap ekle" butonu eklendi.
- **[Küçük]** Tutarlılık · `wrapped.tsx` + `library.tsx` — Dönem/görünüm state'i iki ekranda bağımsız; dönem mantığı kopya. → Ortak `usePeriod` hook'u.
- ✅ **[Küçük — düzeltildi]** Free geçmişi · `wrapped.tsx` & `library.tsx` — Aylık ve yıllık kilit kuralları çelişiyordu. → Yıllık kilit de 3 aylık pencereye göre hesaplanıyor (iki ekranda aynı kural).
- ✅ **[Küçük — düzeltildi]** Kopya dili · CSV/PDF "Düşünce" → "Not" olarak tekleştirildi.

## 7 · Paylaşım Kartları (özel denetim)

- ✅ **[Orta — düzeltildi]** ViewShot çıktısı · `share-book.tsx` — PNG köşeleri şeffaf çıkıyordu. → Radius yalnız ekrandaki önizlemede.
- ✅ **[Orta — düzeltildi]** Çözünürlük · `share-book.tsx` — Çıktı cihaz ekranına bağlıydı. → Sabit çözünürlük.
- ✅ **[Orta — düzeltildi]** Küçük ekran · `share-book.tsx` — SE/mini'de kart taşıyordu. → Önizleme orantılı `scale` ile sığıyor.
- ✅ **[Orta — düzeltildi]** Tipografi · `share-book.tsx` — Android'de dikey kırpma riski. → `lineHeight` düzeltmesi.
- ✅ **[Orta — düzeltildi]** Alıntı kartı · `share-book.tsx` — Kesik alıntı + tırnak kırık görünüyordu. → Uzun alıntı küçülerek sığıyor.
- ✅ **[Orta — düzeltildi]** Varyant kilidi · `share-book.tsx` — Kilit nedeni söylenmiyordu. → Dokununca neden/nasıl ipucu.
- ✅ **[Küçük — düzeltildi]** İstatistik kartı · `share-book.tsx` — "BİTİRME SÜRESİ: 1 gün" yanlış istatistiği. → Oturum verisi yoksa blok gizli.
- ✅ **[Küçük — düzeltildi]** Alıntı kartı · `share-book.tsx` — Not, kitap alıntısı gibi sunuluyordu. → "okur notu" atfı.
- ✅ **[Küçük — düzeltildi]** Kaydet · `share-book.tsx` — İzin reddi sessizdi; tam galeri izni isteniyordu. → Uyarı + salt-ekleme izni.
- ✅ **[Küçük — düzeltildi]** Düzen · `share-book.tsx` — "Kaydedildi" rozeti düzeni zıplatıyordu. → Sabit yükseklik.
- **[Doğrulama notu]** WYSIWYG: kart içeriği tek `ShareCard` ağacından hem ekrana hem capture'a gidiyor (ayrı render yok) — birebirlik ilkesel olarak sağlanmış; Android'de `elevation` gölgelerinin ViewShot'ta soluk çıkma ihtimaline karşı gerçek cihazda 5 varyant × 2 format kaydedilip piksel karşılaştırması yapılmalı.

## 8 · Free/Pro Geçişleri (kapı bütünlüğü)

- ✅ **[Orta — düzeltildi]** Kapı envanteri — Özet→kart ve Wrapped/dışa aktarma delikleri kapatıldı; ayrıca `share-book` ekranının kendisine `isPro` kontrolü kondu (kapı kaynakta değil hedefte — derin bağlantı `ayrac://share-book?id=…` dahil).
- **[Küçük]** Limit kapsamı · `add-book.tsx` — 5 kitap limiti "Okuyacağım" rafını da sayıyor; bilinçli bir ürün kararı mı, netleştirilip paywall metnine yansıtılmalı. (Ürün kararı bekliyor.)

## 9 · Kesişen: Görsel Bütünlük & Çevrimdışı

- **[Orta]** Kapaklar çevrimdışı · `components/BookCover.tsx` + `add-book.tsx` — Kapaklar uzak URL olarak saklanıyor, disk önbelleği yok; internet yokken otomatik kapaklar kaybolur. → Kitap eklenirken kapağı `expo-file-system` ile yerel dosyaya indir (veya `expo-image`'a geçip önbellekten yararlan).
- ✅ **[Küçük — düzeltildi]** Görsel hata durumu · `components/BookCover.tsx` — Kapak yüklenemezse boş görüntü kalıyordu. → `onError`'da harfli renk bloğuna düşüyor.

---

## Kalan açık maddeler (öncelik sırası)

1. **Kapakların çevrimdışı önbelleklenmesi** (Orta, §9) — "kitapların telefonunda kalır" vaadinin gereği.
2. Ortak `FormSheet` bileşeni (§3) ve ortak `usePeriod` hook'u (§6) — kopya desenlerin tekleştirilmesi.
3. Isı haritasının seçili yıla hizalanması (§6).
4. Splash/onboarding'in açık temadaki siyah zemini — marka kararı netleştirilmeli (§1).
5. Free limitinin "Okuyacağım" rafını sayması — ürün kararı + paywall metni (§8).
