# ayraç · Bütünsel Kullanıcı Deneyimi Denetimi

_Tarih: 4 Temmuz 2026 · Yöntem: tüm akışların kod üzerinden zihinsel yürüyüşü (onboarding → ekleme → düzenleme → okuma modu → hedef → özet → paylaşım → ayarlar → Free/Pro). Kod değişikliği yapılmadı._

## Yönetici Özeti

- **Toplam madde: 57** — Kritik: **7** · Orta: **28** · Küçük: **22**
- **Güncelleme (4 Temmuz 2026):** 7 kritik bulgunun tamamı ve paylaşım kartı bölümündeki (§7) 10 maddenin tamamı düzeltildi — aşağıda ✅ ile işaretli.
- **En çok sorun biriken üç alan:**
  1. **Paylaşım kartları & ViewShot çıktısı** (10 madde) — görsel işçilik iyi kurulmuş ama çıktı köşe şeffaflığı, çözünürlük ve uzun metin davranışında pürüzlü.
  2. **Erişilebilirlik** (11 madde) — 44pt altı hedefler yaygın, `mutedStrong` koyu temada 0.18 alfa ile metin için okunmaz düzeyde.
  3. **Barkod / kamera akışı** (8 madde) — bilinen şüpheli alan haklı çıktı: hata mesajları kamera katmanının altında kalıyor ve başarısız taramada sonsuz yeniden-tarama döngüsü var.
- **Monetizasyon tutarsızlığı ayrıca kritik:** Wrapped, PDF/CSV ve Özet→Paylaş yolu Pro kilidini tamamen atlıyor; kullanıcı Pro'ya neden geçsin sorusu kodda cevapsız.
- **Olumlu:** Boş/verisiz durumlar paylaşım kartlarında zarif çözülmüş ("—" yok, alanlar gizleniyor, varyant kilitleniyor); `BookCover`/`ScalePressable`/`RatingText` ortak bileşen disiplini tutarlı; migration'lar bayrak korumalı ve güvenli.

---

## 1 · Açılış & Onboarding

- **[Orta]** Splash · `app/splash.tsx:56-59` — Her açılışta 2.5–6 sn zorunlu bekleme var, dokunarak geçilebildiği hiçbir yerde söylenmiyor (görünmez özellik). → Alıntının altına soluk "dokun ve geç" ipucu ekle veya süre tabanını düşür.
- **[Küçük]** Splash · `app/splash.tsx:47-49,75` — `@ayrac_has_entered` async okunmadan kullanıcı ekrana dokunursa dönen kullanıcı onboarding'e geri düşer (yarış durumu). → Dokunma işleyicisini storage okuması tamamlanana dek pasif tut.
- **[Orta]** Splash · `app/splash.tsx:75` — Tüm ekran `Pressable` ama `accessibilityLabel`/`accessibilityRole` yok; VoiceOver kullanıcısı geçiş eylemini bilemez. → "Devam et" etiketli buton semantiği ekle.
- **[Küçük]** Onboarding · `app/(onboarding)/index.tsx:164-169,228-233` — "Geç" butonu ~32pt dokunma yüksekliğinde (44pt altı) ve `accessibilityRole` yok. → `minHeight: 44` + rol/etiket.
- **[Küçük]** Onboarding · `app/(onboarding)/index.tsx:16,187` — Slayt genişliği modül yüklenirken alınan `Dimensions.get('window')` değerine sabitlenmiş; iPad'de (app.json `supportsTablet: true`) boyut değişiminde sayfalama bozulur. → `useWindowDimensions` kullan.
- **[Küçük]** Onboarding/Splash · `app/splash.tsx`, `app/(onboarding)/index.tsx` — Açık tema kullanıcısı için de zorla siyah zemin; ayarlardan açık temaya geçen kullanıcı her açılışta koyu→açık sıçrama yaşar. → Bilinçli marka kararıysa geçişi fade ile yumuşat, değilse tema token'larına bağla.
- **[Küçük]** İsim ekranı · `app/(auth)/register.tsx:69-83` — İsim boşken "Başla" ile "İsimsiz devam et" birebir aynı işi yapıyor; iki eşdeğer buton kararsızlık üretir. → İsim boşken "Başla"yı pasifleştir veya tek butona indir.
- **[Orta]** İsim ekranı · `app/(auth)/register.tsx:82` + `constants/tokens.ts:44` — "İsimsiz devam et" metni koyu temada `mutedStrong` (0.18 alfa krem, ~1.6:1 kontrast) ile pratikte görünmez. → En az `muted` (0.45) kullan; `mutedStrong`'u metin için yasakla.

## 2 · Kitap Ekleme — Arama / Barkod / Manuel

- ✅ **[Kritik — düzeltildi]** Barkod · `app/(app)/add-book.tsx:386-388,518-566` — `scanError` metni sheet'in içinde render ediliyor ama tarayıcı tam ekran overlay üstte olduğu için "Kitap bulunamadı" / "Bağlantı hatası" mesajlarını kullanıcı tarayıcı açıkken **hiç görmüyor**. → Hata metnini tarayıcı overlay'inin içinde (çerçevenin altında) göster.
- ✅ **[Kritik — düzeltildi]** Barkod · `app/(app)/add-book.tsx:185-199` — Arama başarısız olunca `scannedRef.current = false` yapılıyor; barkod hâlâ çerçevedeyken saniyede defalarca yeniden taranıp Open Library'ye istek yağdıran görünmez bir döngü oluşuyor. → Başarısızlık sonrası 2-3 sn bekleme (cooldown) veya aynı ISBN'i tekrar sorgulamama koşulu ekle.
- **[Orta]** Barkod · `app/(app)/add-book.tsx:163-175` — Kamera izni kalıcı reddedilmişse (`canAskAgain: false`) kullanıcıya sadece "Kamera izni verilmedi." yazılıyor; `PhotoPickerSheet`'teki gibi "Ayarları aç" yolu yok — çıkmaz sokak. → Ortak `permissionDeniedAlert` yardımcısını burada da kullan.
- **[Orta]** Barkod · `app/(app)/add-book.tsx:520-528` — Düşük ışık için fener (torch) kontrolü yok; `CameraView`'ın `enableTorch` prop'u desteklerken karanlıkta tarama fiilen imkânsız. → Overlay'e fener aç/kapa butonu ekle.
- **[Orta]** Barkod · `app/(app)/add-book.tsx:518-567` — Tarayıcı Modal değil zIndex'li overlay (bilinçli, expo#28846); ancak VoiceOver odağı alttaki formda kalabilir. → Overlay açıkken sheet'e `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"` ver.
- **[Orta]** Arama · `app/(app)/add-book.tsx:128-140` — İnternet yokken/istek düşünce `catch` sonuçları sessizce boşaltıyor; kullanıcı spinner biter, hiçbir açıklama görmez ("sonuç yok" ile "bağlantı yok" ayrımı yok). → Boş sonuç ve ağ hatası için iki ayrı tek satırlık durum mesajı ekle.
- **[Orta]** Arama · `app/(app)/add-book.tsx:40,69` — `fetch` çağrılarında timeout yok; asılı kalan istek spinner'ı dakikalarca döndürebilir. → `AbortController` ile 8-10 sn timeout.
- **[Orta]** Form · `app/(app)/add-book.tsx:258-261,277-279` — Backdrop'a veya kapat butonuna dokunmak doldurulmuş formu onaysız siliyor (geri dönüşsüz adım). → Form kirliyse "Vazgeçilsin mi?" onayı sor.
- **[Orta]** Form · `app/(app)/add-book.tsx:219-221` — Free kullanıcı 5 kitap sınırındayken tüm formu doldurup ancak "Kitabı ekle"ye basınca paywall'a çarpıyor; emek boşa gidiyor. → Sınırdayken sheet açılışında bilgilendir veya banner'ı sheet içinde göster.
- **[Orta]** Form · `app/(app)/add-book.tsx:379-384` — Barkod butonu ikon-only ve `accessibilityLabel` yok. → "Barkod tara" etiketi ekle.
- **[Küçük]** Form · `app/(app)/add-book.tsx:277-279` — Kapat butonu 36×36 ve etiketi yok; `edit-book`'taki eşleniğinde etiket var (tutarsızlık). → `hitSlop` + "Kapat" etiketi.
- **[Küçük]** Form · `app/(app)/add-book.tsx:152-158` — `setCoverImage` updater'ının içinde `setCoverSource` çağrısı (state updater içinde yan etki) StrictMode/Fabric'te çift çalışabilir. → İki set'i updater dışında koşullu yap.
- **[Küçük]** Form · `app/(app)/add-book.tsx:217` — Yazar alanı zorunlu; barkodla gelen kayıtta yazar boş dönerse buton neden pasif olduğunu söylemiyor. → Pasif butona eksik alan ipucu ekle.
- **[Küçük]** Form · `app/(app)/add-book.tsx:454-461` — Tür serbest metin ("Roman"/"roman"/"roman ") — öneriler ve tür analitiği aynı türü ayrı sayar. → Öneri chip'leri veya kaydederken normalize et.
- **[Küçük]** Fotoğraf · `components/PhotoPickerSheet.tsx`, `components/CoverCropper.tsx`, `app/(app)/add-book.tsx:297` — Üretim koduna gömülü çok sayıda `console.log` teşhis satırı kaldı. → `__DEV__` koşuluna al veya sil. (Not: iki bilinen tuzağa karşı sıralama/pendingRef sağlamlaştırması doğru kurulmuş görünüyor; picker iptali ve izin reddi düzgün ele alınıyor.)
- **[Küçük]** Kırpma · `components/CoverCropper.tsx:60-85` — Kırpma yalnızca jest ile yapılabiliyor; ekran okuyucu kullanıcısı için alternatif yok. → "Kırpmadan kullan" düğmesi ekle (getSize hatasındaki davranışla aynı).

## 3 · Kitap Düzenleme

- ✅ **[Kritik — düzeltildi]** Not · `app/(app)/edit-book.tsx:67-74` — 50 karakterin altındaki not kaydedilince **sessizce eski nota geri dönülüyor**; kullanıcı yazdığını kaybettiğini ancak sonra fark eder (boş bırakmak siliyor, kısa yazmak eskiyi koruyor — iki farklı sessiz davranış). → Kaydetmeden önce uyar ("Notun 50 karakterin altında, kaydedilmeyecek") veya kısa notu da kaydet.
- **[Orta]** Durum · `app/(app)/edit-book.tsx:64` — "Bitti"den "Okunuyor"a geçip kaydetmek puanı (ve `finishedAt`i) uyarısız sıfırlıyor; yanlışlıkla dokunuşta veri kaybı. → Durum değişiminde puan/tarih silinecekse tek satır onay göster.
- **[Orta]** Navigasyon · `app/(app)/edit-book.tsx:300` — "Okuma modunu başlat" önce `handleSave()` (içinde `router.back()`) sonra `router.push()` çağırıyor; aynı frame'de iki navigasyon — yarış ve çift geçiş animasyonu riski. → `handleSave`'i navigasyonsuz bir `persist()`'e ayır, tek `router.replace` yap.
- **[Orta]** Sheet · `app/(app)/edit-book.tsx:114` — Backdrop `View`, dokununca kapanmıyor; `add-book`'ta backdrop `Pressable` ve kapatıyor — aynı görünümlü iki sheet farklı davranıyor. → Davranışı eşitle (kirli form onayıyla birlikte).
- **[Orta]** Sheet · `app/(app)/edit-book.tsx` (tümü) — Buradan da kapatınca değişiklikler onaysız kayboluyor (kaydet butonu ayrı). → Kirli form kontrolü ekle.
- **[Küçük]** Tutarlılık · `add-book.tsx:574` vs `edit-book.tsx:353` — Sheet üst boşluğu 80/90, backdrop opaklığı 0.5/0.35, gölge 0.4/0.2, durum butonu dolgusu 10/9 — aynı desenin iki el işi kopyası. → Ortak `FormSheet` bileşenine çıkar.
- **[Küçük]** Tema · `app/(app)/edit-book.tsx:299` — "Okuma modunu başlat" butonu `#000`/`#333` sabit; açık temada token sistemi dışında tek yabancı yüzey. → Token kullan veya bilinçliyse yorumla işaretle.
- **[Küçük]** Alıntı · `app/(app)/edit-book.tsx:226-244` — Alıntı yalnızca "Bitti" durumunda girilebiliyor; okurken not alan kullanıcı (en olası an) alıntıyı giremez. → Alıntı alanını `reading` durumunda da göster.

## 4 · Okuma Modu

- ✅ **[Kritik — düzeltildi]** Oturum kaybı · `app/(app)/reading-mode.tsx:37,62-75` — Oturum yalnızca bellekte; kullanıcı telefonu bırakıp kitap okurken (tam hedef senaryo!) iOS uygulamayı öldürürse 2 saatlik oturum tamamen kaybolur. → Oturum başlangıcını AsyncStorage'a yaz; açılışta yarım kalan oturumu "kurtarılsın mı?" diye sor.
- ✅ **[Kritik — düzeltildi]** Store riski · `app/(app)/reading-mode.tsx:56` — `Linking.openURL('App-Prefs:SOUNDS')` özel (private) URL şeması; App Store incelemesinde red gerekçesidir ve yeni iOS sürümlerinde çalışmayabilir. → iOS'ta yönlendirme metnini "Odak modunu aç" önerisine çevir veya `Linking.openSettings()` kullan.
- **[Orta]** Sessiz önerisi · `app/(app)/reading-mode.tsx:39` — "Telefonunu sessize al" popup'ı her oturumda yeniden çıkıyor; "Hayır, kalsın" diyen kullanıcıya her gün aynı soru = sürtünme. → Tercihi bir kez sorup AsyncStorage'da hatırla.
- **[Orta]** Çıkış · `app/(app)/reading-mode.tsx:119-156` — Tek çıkış yolu "Kaydet ve çık"; yanlışlıkla açılan oturumu kaydetmeden atma seçeneği yok. → Onay diyaloğuna üçüncü, sessiz "Kaydetmeden çık" bağlantısı ekle.
- **[Orta]** Android geri · `app/(app)/(main)` yığını — Donanım geri tuşu fullScreenModal'ı onaysız kapatır, süre kaydedilmez. → `usePreventRemove`/`beforeRemove` ile onay diyaloğuna bağla.
- **[Küçük]** Veri kirliliği · `app/(app)/reading-mode.tsx:65` — 1-2 saniyelik kazara oturumlar da kaydediliyor; ısı haritasında "okunan gün" ve seri sayacını şişirir. → 60 sn altını kaydetmeden at (veya sorarak).

## 5 · Kütüphane, Hedefler & Ayarlar

- **[Orta]** Hatırlatıcı · `app/(app)/(main)/library.tsx:472-475` — Bildirim izni reddedilirse modal sessizce kapanıyor; kullanıcı hatırlatıcının kurulduğunu sanıyor. → İzin reddinde "Ayarları aç" seçenekli uyarı göster ve anahtarı kapalı bırak.
- **[Orta]** Bildirim · `utils/notifications.ts:57-66` — Android 8+ için bildirim kanalı (`setNotificationChannelAsync`) hiç oluşturulmuyor; zamanlanmış bildirim bazı cihazlarda hiç görünmeyebilir. → Uygulama açılışında bir kez kanal oluştur.
- **[Küçük]** Bildirim içeriği · `utils/notifications.ts:42-55` — Başlıktaki seri sayısı ve kitap adı zamanlama anında donduruluyor; üç gün sonra "5 günlük seri 🔥" yalan söyler. → İçeriği nötr yaz veya her uygulama açılışında yeniden zamanla.
- **[Orta]** Veri silme · `context/BooksContext.tsx:138-142` + `library.tsx:640` — "Tüm verileri sil" yalnız kitap+oturumları siliyor; hedefler, isim ve **kurulu günlük bildirim** kalıyor — boş uygulamaya her akşam bildirim gelir. → `resetAll`'a hedef/isim temizliği ve `cancelReminder()` ekle.
- **[Orta]** Hedef · `context/GoalContext.tsx` + `library.tsx:713-717` — Aylık hedef tek global değer ama modal metni "Mayıs 2026 için kaç kitap…" diye döneme özel söz veriyor; Haziran'a geçince aynı hedef sessizce oradadır. → Metni "Her ay için hedefin" yap veya hedefi dönem-bazlı sakla.
- **[Küçük]** Hedef · `library.tsx:405-411` — Geçersiz/0 girişi hedefi sessizce kaldırıyor ("Kaldır" butonu ayrıca varken). → Geçersiz girişte hata göster, kaldırmayı yalnız "Kaldır"a bırak.
- **[Orta]** Erişilebilirlik · `library.tsx:753-782,180-186,129-134` — 44pt altı hedefler kümesi: ayar/bildirim ikonları 36pt, Aylık/Yıllık anahtarı ~26pt, öneri kartı ekle butonu 28pt, not düzenleme kalemi 36pt. → `hitSlop` veya min. 44pt kapsayıcı.
- **[Orta]** Kontrast · `library.tsx:136-138` — Not gövdesi `mutedStrong` ile koyu temada 0.18 alfa — kullanıcının kendi yazdığı not okunamaz soluklukta. → `muted` veya `fg` kullan.
- **[Orta]** Performans · `library.tsx:842-941` — Liste `ScrollView` + `map`; Pro'da sınırsız kitapla tüm satırlar tek seferde mount olur, `BookRow` memo'suz. → `FlatList`/`SectionList` + `React.memo(BookRow)`.
- **[Orta]** Navigasyon · `components/ui/BottomNav.tsx:31,57` — Sekmeler `router.push` kullanıyor; Kitaplık↔Özet arasında her geçiş yığına ekleniyor, Android geri tuşu tüm geçmişi tek tek geri sarar. → `router.replace` kullan.
- **[Küçük]** Performans · `library.tsx:379-397` — Filtreler/istatistikler her render'da (her modal state değişiminde) yeniden hesaplanıyor. → `useMemo(books, view, period)`.
- **[Küçük]** Sessizlik ilkesi · `library.tsx:791-803` — 3. kitaptan itibaren kalıcı "Pro'ya geç" banner'ı PRODUCT.md'nin "kutla ama bağırma" ilkesiyle çelişen sürekli bir dürtme. → Yalnız 5/5 sınırında veya kapatılabilir göster.
- **[Küçük]** Öneriler · `library.tsx:430-449` — Öneri isteği düşerse bölüm sessizce yok oluyor; Pro kullanıcı özelliğin varlığını unutur. → Küçük "yüklenemedi · tekrar dene" satırı.
- **[Küçük]** Kopya · `library.tsx:547` + `context/ProContext.tsx:156` — ₺29,99 fiyatı iki yerde elle yazılmış. → Tek sabite taşı.

## 6 · Özet (Wrapped)

- ✅ **[Kritik — düzeltildi]** Pro sızıntısı · `wrapped.tsx:510-527` — "Okunan kitaplar" satırına dokunmak doğrudan `share-book`'a gidiyor; `edit-book`'ta paywall'la korunan BİTİRDİM kartına Free kullanıcı buradan serbestçe ulaşıyor. → Satır basışında `isPro` kontrolü + `showPaywall('bitirdim_card')`.
- ✅ **[Kritik — düzeltildi]** Pro sızıntısı · `wrapped.tsx:375-415,613-645` + `ProContext.tsx:30-33,58` — "Yıllık Wrapped & paylaşım" ve "PDF & CSV dışa aktarma" Pro özellik listesinde satılıyor ama Wrapped ekranı ve dışa aktarma butonları tamamen kapısız; `wrapped` paywall trigger'ı kodda hiç kullanılmıyor. → Çözüm: yıllık görünüm `wrapped` tetiğine, PDF/CSV yeni `export` tetiğine bağlandı; aylık özet Free'de kaldı.
- **[Orta]** Isı haritası · `wrapped.tsx:149` — 52 haftalık yatay grid en solda (bir yıl öncesinde) açılıyor; kullanıcının görmek istediği bugünkü uç görünmüyor. → Mount'ta `scrollToEnd`.
- **[Orta]** Isı haritası · `wrapped.tsx:50-124` — Her render'da 364 hücre + tarih hesabı yeniden kuruluyor, memo yok; Free'de kilitli önizleme bile tam grid'i render ediyor. → Grid'i `useMemo` + `React.memo`; kilitli önizleme için statik placeholder.
- **[Orta]** Dışa aktarma · `wrapped.tsx:396-400,410-414` — CSV/PDF hatası `console.warn`'a gidiyor; spinner durur, kullanıcı hiçbir şey öğrenmez. → Kısa hata bildirimi (alert/inline).
- **[Küçük]** Isı haritası · `wrapped.tsx:85-100` — Grid daima "son 52 hafta"; kullanıcı 2025'e geçse bile bugüne göre çiziliyor — dönem gezgini ile çelişiyor. → Seçili yıla hizala veya kartı dönem navigasyonundan bağımsız olduğunu belirterek en alta sabitle.
- **[Küçük]** Boş durum · `wrapped.tsx:290-304` — "Başka bir dönem seç ya da kitap ekle" diyor ama eylem butonu yok (kütüphane boş durumunda var). → "Kitap ekle" butonu ekle.
- **[Küçük]** Tutarlılık · `wrapped.tsx` + `library.tsx` — Dönem/görünüm state'i iki ekranda bağımsız (Kitaplık'ta Yıllık'a geçen kullanıcı Özet'te Aylık bulur); `MONTHS_TR`, `isOlderThan3Months`, dönem mantığı üç dosyada kopya. → Ortak `usePeriod` hook'u.
- **[Küçük]** Free geçmişi · `wrapped.tsx:332` & `library.tsx:510` — Aylıkta "son 3 ay" serbestken yıllıkta önceki yıl tamamen kilitli; Ocak ayında 3 aylık pencere önceki yıla taşar — iki kural çelişir. → Yıllık kilidi de 3 aylık pencereye göre hesapla.
- **[Küçük]** Kopya dili · `edit-book.tsx` "NOTUN" / paylaşım kartı "OKUR NOTU" / CSV-PDF "Düşünce" — aynı alan üç isim. → Tek terime karar ver ("Not").

## 7 · Paylaşım Kartları (özel denetim)

- ✅ **[Orta — düzeltildi]** ViewShot çıktısı · `share-book.tsx:686-690,810` — ViewShot ve kart `borderRadius: 16 + overflow: hidden` ile sarılı; kaydedilen PNG'nin köşeleri **şeffaf** çıkar — Instagram'a yüklenince köşelerde arka plan sırıtır, ekranda görünenle birebir değildir. → Capture sarmalayıcısından radius'u kaldır (yalnız ekrandaki önizlemeye uygula) veya kartı düz köşeli capture et.
- ✅ **[Orta — düzeltildi]** Çözünürlük · `share-book.tsx:18-21,686-689` — Çıktı boyutu cihaz ekranına bağlı (`W-48` × pixelRatio); story kartı hiçbir cihazda tam 1080×1920 değil, küçük telefonlarda düşük çözünürlüklü çıkar. → ViewShot `options`'a sabit `width/height` (1080×1920 / 1080×1350) ver.
- ✅ **[Orta — düzeltildi]** Küçük ekran · `share-book.tsx:19-20,684-708` — `STORY_H ≈ 581pt` sabit; iPhone SE/mini'de önizleme kartı header/panel/butonlarla üst üste taşar (flex:1 alan yetmez). → Önizlemeyi kullanılabilir yüksekliğe `transform: scale` ile sığdır.
- ✅ **[Orta — düzeltildi]** Tipografi · `share-book.tsx:81` — `adjustsFontSizeToFit` + sabit `lineHeight` kombinasyonu Android'de küçülen metnin dikey kırpılmasına yol açan bilinen RN davranışı; başlıklar cihazda güdük çıkabilir. → Android'de `lineHeight`'ı orana bağla veya font küçülünce lineHeight'ı kaldır.
- ✅ **[Orta — düzeltildi]** Alıntı kartı · `share-book.tsx:382-391` — 200 karakterlik alıntı story'de ~8 satıra sığmayınca `…` ile kesiliyor ve hemen ardından kapanış tırnağı geliyor ("…”") — kesik alıntı + tırnak işçilik açısından kırık görünüyor. → Alıntıya da `adjustsFontSizeToFit` ver veya karakter sınırını satır kapasitesine göre belirle.
- ✅ **[Orta — düzeltildi]** Varyant kilidi · `share-book.tsx:713-728` — Kilitli Alıntı/İstatistik varyantına dokununca yalnız uyarı titreşimi geliyor; neden kilitli ve nasıl açılır hiç söylenmiyor. → Dokununca tek satır ipucu göster ("Alıntı eklersen açılır → Düzenle").
- ✅ **[Küçük — düzeltildi]** İstatistik kartı · `share-book.tsx:602-607` — Geçmişe dönük "Bitti" eklenen kitapta `days = max(1, …)` "BİTİRME SÜRESİ: 1 gün" gibi yanlış bir istatistik üretir. → Oturum verisi yoksa bu bloğu gösterme.
- ✅ **[Küçük — düzeltildi]** Alıntı kartı · `share-book.tsx:363` — Alıntı yoksa kullanıcının "notu" tırnak içinde kitap alıntısıymış gibi sunuluyor (Editöryel'deki "OKUR NOTU" atfı burada yok). → Not fallback'inde küçük "okur notu" atfı ekle.
- ✅ **[Küçük — düzeltildi]** Kaydet · `share-book.tsx:638-640` — Galeri izni reddedilirse buton sessizce hiçbir şey yapmıyor; ayrıca tam kütüphane izni isteniyor, salt-ekleme (`writeOnly`) yeterli. → İzin reddinde uyarı + `requestPermissionsAsync(true)`.
- ✅ **[Küçük — düzeltildi]** Düzen · `share-book.tsx:745-751` — "Galeriye kaydedildi" rozeti belirince buton bloğu aşağı zıplıyor (layout shift). → Rozete sabit yükseklik ayır veya toast olarak üstte göster.
- **[Doğrulama notu]** WYSIWYG: kart içeriği tek `ShareCard` ağacından hem ekrana hem capture'a gidiyor (ayrı render yok) — birebirlik ilkesel olarak sağlanmış; kalan riskler yukarıdaki köşe şeffaflığı ve Android'de `elevation` gölgelerinin ViewShot'ta soluk çıkma ihtimali. Gerçek cihazda 5 varyant × 2 format kaydedilip piksel karşılaştırması yapılmalı.

## 8 · Free/Pro Geçişleri (kapı bütünlüğü)

- **[Orta]** Kapı envanteri — Korunuyor: kitap limiti (ekleme + öneri ekleme), BİTİRDİM kartı (yalnız edit-book yolundan), 3 ay geçmiş, öneriler, ısı haritası, not yazma. Delik: Özet→kart (Kritik, §6), Wrapped/dışa aktarma (Kritik, §6), derin bağlantı `ayrac://share-book?id=…` doğrudan açılabilir. → `share-book` ekranının kendisine `isPro` kontrolü koy (kapıyı kaynağa değil hedefe taşı).
- **[Küçük]** Limit kapsamı · `add-book.tsx:221` — 5 kitap limiti "Okuyacağım" rafını da sayıyor; okuma listesine iki kitap ekleyen Free kullanıcının fiili kütüphanesi 3'e düşer — bilinçli bir ürün kararı mı, netleştirilip paywall metnine yansıtılmalı.

## 9 · Kesişen: Görsel Bütünlük & Çevrimdışı

- **[Orta]** Kapaklar çevrimdışı · `components/BookCover.tsx` + `add-book.tsx:47` — Kapaklar Open Library **uzak URL** olarak saklanıyor ve RN `Image` ile çiziliyor (disk önbelleği yok); internet yokken kütüphane ve paylaşım kartlarındaki tüm otomatik kapaklar boş kutuya döner — "kitapların telefonunda kalır" vaadiyle çelişir. → Kitap eklenirken kapağı `expo-file-system` ile yerel dosyaya indir (veya en azından `expo-image`'a geçip önbellekten yararlan).
- **[Küçük]** Görsel hata durumu · `components/BookCover.tsx:14-20` — Uzak kapak 404/yüklenemez olursa `onError` yok; renkli sırt fallback'i yerine boş görüntü kalır. → `onError`'da harfli renk bloğuna düş.

---

## Önerilen ele alma sırası (tartışmaya açık)

1. **Kritikler** — Pro sızıntıları (K, §6+§8), tarayıcı hata görünürlüğü + yeniden tarama döngüsü (K, §2), okuma oturumu kalıcılığı + App-Prefs (K, §4), not kaybı (K, §3).
2. **Paylaşım kartı çıktı kalitesi** — köşe şeffaflığı + sabit çözünürlük + küçük ekran sığdırma (tek PR'lık iş).
3. **Erişilebilirlik süpürmesi** — `mutedStrong` metin yasağı + 44pt hedef turu (mekanik, düşük risk).
4. **Hata dayanıklılığı** — arama/dışa aktarma/izin akışlarına kullanıcıya görünür hata mesajları.
5. **Kod sağlığı** — FormSheet/usePeriod ortaklaştırması, FlatList, memo'lar.
