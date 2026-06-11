import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useBooks } from '@/context/BooksContext';
import { usePro } from '@/context/ProContext';
import { fonts, BOOK_COLORS } from '@/constants/tokens';
import { BookCover } from '@/components/BookCover';
import { PhotoPickerSheet } from '@/components/PhotoPickerSheet';
import { CoverCropper } from '@/components/CoverCropper';
import { ScalePressable } from '@/components/ScalePressable';
import { KeyboardDoneBar, doneBarProps } from '@/components/KeyboardDoneBar';

type Status = 'reading' | 'finished' | 'want';

type OLResult = {
  title: string;
  author: string;
  pages: number;
  coverId: number | null;
  coverUrl: string | null;
};

function coverUrlFromId(coverId: number, size: 'S' | 'L' = 'L') {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

async function searchOpenLibrary(query: string): Promise<OLResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,number_of_pages_median,cover_i&limit=5`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.docs ?? []).map((doc: any) => ({
    title: doc.title ?? '',
    author: doc.author_name?.[0] ?? '',
    pages: doc.number_of_pages_median ?? 0,
    coverId: doc.cover_i ?? null,
    coverUrl: doc.cover_i ? coverUrlFromId(doc.cover_i) : null,
  }));
}

// Kapak sırası: Open Library cover_i → Open Library ISBN görseli → Google Books
async function resolveCoverByISBN(isbn: string, coverId: number | null): Promise<string | null> {
  if (coverId) return coverUrlFromId(coverId);
  const isbnUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  try {
    const head = await fetch(isbnUrl, { method: 'HEAD' });
    if (head.ok) return isbnUrl;
  } catch {}
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const json = await res.json();
    const thumb = json.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    if (thumb) return String(thumb).replace('http://', 'https://');
  } catch {}
  return null;
}

async function lookupByISBN(isbn: string): Promise<OLResult | null> {
  const url = `https://openlibrary.org/search.json?isbn=${isbn}&fields=title,author_name,number_of_pages_median,cover_i&limit=1`;
  const res = await fetch(url);
  const json = await res.json();
  const doc = json.docs?.[0];
  if (!doc) return null;
  const coverId = doc.cover_i ?? null;
  return {
    title: doc.title ?? '',
    author: doc.author_name?.[0] ?? '',
    pages: doc.number_of_pages_median ?? 0,
    coverId,
    coverUrl: await resolveCoverByISBN(isbn, coverId),
  };
}

export default function AddBookScreen() {
  const { t } = useTheme();
  const { addBook, books } = useBooks();
  const { isPro, showPaywall } = usePro();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState('');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState<Status>('reading');
  const [rating, setRating] = useState(0);
  const [color, setColor] = useState(BOOK_COLORS[0]);

  const [results, setResults] = useState<OLResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [coverImage, setCoverImage] = useState<string | undefined>();
  const [coverSuggestion, setCoverSuggestion] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [scanCropUri, setScanCropUri] = useState<string | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanEvents, setScanEvents] = useState<string[]>([]);
  const scannedRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const logScan = (msg: string) => {
    console.log('[Scanner]', msg);
    setScanEvents((prev) => [...prev.slice(-2), msg]);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (title.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchOpenLibrary(title.trim());
        setResults(res);
        // Manuel eklemede arka plan kapak önerisi
        setCoverSuggestion(res.find((r) => r.coverUrl)?.coverUrl ?? null);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title]);

  const selectResult = (item: OLResult) => {
    setTitle(item.title);
    setAuthor(item.author);
    if (item.pages > 0) setPages(String(item.pages));
    // Kapak otomatik gelsin — kullanıcının kendi çektiği fotoğrafı ezme
    if (item.coverUrl) setCoverImage((prev) => prev ?? item.coverUrl ?? undefined);
    setResults([]);
    setCoverSuggestion(null);
  };

  const openScanner = async () => {
    setScanError('');
    setScanEvents([]);
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        setScanError('Kamera izni verilmedi.');
        return;
      }
    }
    scannedRef.current = false;
    setScannerOpen(true);
  };

  const handleBarcode = async ({ type, data }: { type: string; data: string }) => {
    // Handler hep bağlı kalır; tekrar taramayı ref ile engelleriz.
    // (undefined'a çevirip geri bağlamak bazı cihazlarda taramayı kalıcı durduruyor)
    logScan(`okundu: ${type} → ${data}`);
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanLoading(true);
    try {
      const item = await lookupByISBN(data);
      if (item && item.title) {
        logScan(`bulundu: ${item.title}`);
        selectResult(item);
        setScannerOpen(false);
      } else {
        logScan('Open Library sonucu boş');
        setScanError('Kitap bulunamadı. ISBN: ' + data);
        scannedRef.current = false;
      }
    } catch {
      logScan('ağ hatası');
      setScanError('Bağlantı hatası, tekrar deneyin.');
      scannedRef.current = false;
    } finally {
      setScanLoading(false);
    }
  };

  // Barkod okunmazsa: aynı kameradan kapak fotoğrafı çek, kırpma adımına geç
  const captureCoverFromScanner = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        setScannerOpen(false);
        setScanCropUri(photo.uri);
      }
    } catch {
      setScanError('Fotoğraf çekilemedi, tekrar deneyin.');
    }
  };

  const canSubmit = title.trim().length > 0 && author.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (!isPro && books.length >= 5) { showPaywall('book_limit'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addBook({
      title: title.trim(),
      author: author.trim(),
      pages: parseInt(pages) || 0,
      genre: genre.trim(),
      status,
      rating: status === 'finished' ? rating : 0,
      color,
      coverImage,
    });
    router.back();
  };

  const inp = [styles.input, { backgroundColor: t.surface2, borderColor: t.border, color: t.fg }];

  return (
    <View style={{ flex: 1 }}>
      <KeyboardDoneBar />
      {/* Tarayıcıdan çekilen kapak fotoğrafı için kırpma adımı */}
      <CoverCropper
        uri={scanCropUri}
        onDone={(cropped) => { setScanCropUri(null); setCoverImage(cropped); }}
        onCancel={() => setScanCropUri(null)}
      />

      {/* Photo picker modal */}
      <PhotoPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onPicked={setCoverImage}
        canRemove={!!coverImage}
        onRemove={() => setCoverImage(undefined)}
      />

      {/* Dimmed backdrop */}
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        onPress={() => router.back()}
      />

      <View
        style={[
          styles.sheet,
          { backgroundColor: t.surface, paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: t.border }]} />

        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={[styles.sheetTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>
            Kitap ekle
          </Text>
          <Pressable style={[styles.closeBtn, { backgroundColor: t.bgSoft }]} onPress={() => router.back()}>
            <Ionicons name="close" size={14} color={t.muted} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        >
          {/* Boş alana dokununca klavye kapanır */}
          <Pressable onPress={Keyboard.dismiss} accessible={false} style={{ gap: 10 }}>
          {/* Cover preview + color picker */}
          <View style={styles.coverRow}>
            <Pressable
              onPress={() => { console.log('[PhotoPicker] 0/6 sheet açılıyor (add-book)'); setPickerVisible(true); }}
              style={{ position: 'relative' }}
            >
              <BookCover title={title} color={color} coverImage={coverImage} size={76} radius={4} />
              <View style={[styles.coverEditBadge, { backgroundColor: t.surface }]}>
                <Ionicons name="camera" size={11} color={t.fg} />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>KAPAK RENGİ</Text>
              <View style={styles.colorGrid}>
                {BOOK_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => { Haptics.selectionAsync(); setColor(c); }}
                    hitSlop={10}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: color === c }}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      color === c && { borderWidth: 2, borderColor: t.fg },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Arka plan aramasından gelen kapak önerisi */}
          {coverSuggestion && !coverImage && (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setCoverImage(coverSuggestion); setCoverSuggestion(null); }}
              style={[styles.coverSuggestRow, { backgroundColor: t.bgSoft, borderColor: t.border }]}
              accessibilityLabel="Önerilen kapağı kullan"
              accessibilityRole="button"
            >
              <Image source={{ uri: coverSuggestion }} style={styles.coverSuggestThumb} resizeMode="cover" />
              <Text style={[styles.coverSuggestText, { color: t.muted }]}>
                Bu kapağı bulduk — <Text style={{ color: t.fg, fontWeight: '600' }}>kullan</Text>
              </Text>
              <Ionicons name="add-circle-outline" size={16} color={t.muted} />
            </Pressable>
          )}

          {/* Kitap adı + arama */}
          <View>
            <Text style={[styles.fieldLabel, { color: t.muted }]}>KİTAP ADI</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, position: 'relative' }}>
                <TextInput
                  style={inp}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Örn. Tutunamayanlar"
                  placeholderTextColor={t.mutedStrong}
                  autoCorrect={false}
                />
                {searching && (
                  <ActivityIndicator
                    size="small"
                    color={t.muted}
                    style={styles.searchSpinner}
                  />
                )}
              </View>
              <Pressable
                onPress={openScanner}
                style={[styles.scanBtn, { backgroundColor: t.surface2, borderColor: t.border }]}
              >
                <Ionicons name="barcode-outline" size={20} color={t.muted} />
              </Pressable>
            </View>
            {scanError ? (
              <Text style={[styles.scanError, { color: t.orange }]}>{scanError}</Text>
            ) : null}

            {results.length > 0 && (
              <View style={[styles.resultsList, { backgroundColor: t.surface, borderColor: t.border }]}>
                {results.map((item, i) => (
                  <Pressable
                    key={i}
                    onPress={() => selectResult(item)}
                    style={[
                      styles.resultRow,
                      i < results.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border },
                    ]}
                  >
                    {item.coverId ? (
                      <Image
                        source={{ uri: coverUrlFromId(item.coverId, 'S') }}
                        style={styles.resultCover}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.resultCover, styles.resultCoverEmpty, { backgroundColor: t.surface2 }]}>
                        <Ionicons name="book-outline" size={12} color={t.muted} />
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.resultTitle, { color: t.fg }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.resultMeta, { color: t.muted }]} numberOfLines={1}>
                        {item.author}{item.pages > 0 ? ` · ${item.pages} sayfa` : ''}
                      </Text>
                    </View>
                    <Ionicons name="arrow-down-circle-outline" size={16} color={t.muted} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Yazar */}
          <View>
            <Text style={[styles.fieldLabel, { color: t.muted }]}>YAZAR</Text>
            <TextInput
              style={inp}
              value={author}
              onChangeText={setAuthor}
              placeholder="Örn. Oğuz Atay"
              placeholderTextColor={t.mutedStrong}
            />
          </View>

          {/* Sayfa + Tür */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>SAYFA</Text>
              <TextInput
                style={inp}
                value={pages}
                onChangeText={setPages}
                placeholder="340"
                placeholderTextColor={t.mutedStrong}
                keyboardType="number-pad"
                {...doneBarProps}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>TÜR</Text>
              <TextInput
                style={inp}
                value={genre}
                onChangeText={setGenre}
                placeholder="Roman"
                placeholderTextColor={t.mutedStrong}
              />
            </View>
          </View>

          {/* Durum */}
          <View>
            <Text style={[styles.fieldLabel, { color: t.muted }]}>DURUM</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([['reading', 'Okunuyor'], ['finished', 'Bitti'], ['want', 'Okuyacağım']] as [Status, string][]).map(([k, lbl]) => (
                <Pressable
                  key={k}
                  onPress={() => { Haptics.selectionAsync(); setStatus(k); }}
                  style={[
                    styles.statusBtn,
                    {
                      borderColor: status === k ? t.primary : t.border,
                      backgroundColor: status === k ? t.primarySoft : t.bgSoft,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: status === k ? t.primary : t.muted }}>
                    {lbl}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Puan */}
          {status === 'finished' && (
            <View>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>PUANIN</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Pressable key={i} hitSlop={6} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRating(i === rating ? 0 : i); }}>
                    <Ionicons
                      name={i <= rating ? 'star' : 'star-outline'}
                      size={28}
                      color={i <= rating ? t.warning : t.border}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Submit */}
          <ScalePressable
            scale={0.97}
            style={[styles.submit, { backgroundColor: canSubmit ? t.primary : t.border }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityLabel="Kitabı ekle"
            accessibilityRole="button"
          >
            <Text style={[styles.submitText, { color: canSubmit ? '#000' : t.muted }]}>
              Kitabı ekle
            </Text>
          </ScalePressable>
          </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Barkod tarayıcı — Modal İÇİNDE DEĞİL: expo-camera'nın onBarcodeScanned'i
          iOS'ta RN Modal içinde güvenilir tetiklenmiyor (expo/expo#28846).
          Tam ekran overlay olarak en üstte render edilir. */}
      {scannerOpen && (
        <View style={[StyleSheet.absoluteFill, styles.scannerContainer, { zIndex: 100, elevation: 100 }]}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            autofocus="on"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
            onBarcodeScanned={handleBarcode}
            onCameraReady={() => logScan('kamera hazır, taranıyor…')}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>Kitabın barkodunu çerçeveye getir</Text>
          </View>
          {/* Debug: tarama denemeleri canlı görünür (yalnızca geliştirmede) */}
          {__DEV__ && scanEvents.length > 0 && (
            <View style={[styles.scanDebug, { top: insets.top + 64 }]}>
              {scanEvents.map((e, i) => (
                <Text key={i} style={styles.scanDebugText}>{e}</Text>
              ))}
            </View>
          )}
          {scanLoading && (
            <View style={styles.scannerLoadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.scannerLoadingText}>Kitap aranıyor…</Text>
            </View>
          )}
          <Pressable
            style={[styles.scannerClose, { top: insets.top + 12 }]}
            onPress={() => setScannerOpen(false)}
            accessibilityLabel="Tarayıcıyı kapat"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
          <View style={[styles.scannerFooter, { paddingBottom: insets.bottom + 20 }]}>
            <Pressable
              style={styles.scannerFallbackBtn}
              onPress={captureCoverFromScanner}
              accessibilityLabel="Kapak fotoğrafı çekip elle ekle"
              accessibilityRole="button"
            >
              <Ionicons name="camera-outline" size={16} color="#F5F0E8" />
              <Text style={styles.scannerFallbackText}>Barkod okunmuyor mu? Kapağın fotoğrafını çek</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 80,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 14,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  coverRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  coverEditBadge: {
    position: 'absolute', bottom: 3, right: 3,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  coverSuggestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  coverSuggestThumb: { width: 24, height: 36, borderRadius: 3 },
  coverSuggestText: { flex: 1, fontSize: 12 },
  colorSwatch: { width: 22, height: 22, borderRadius: 11 },
  fieldLabel: {
    fontSize: 10, fontWeight: '600', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 5,
  },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
  },
  searchSpinner: {
    position: 'absolute', right: 12, top: 0, bottom: 0,
  },
  resultsList: {
    marginTop: 4, borderWidth: 1, borderRadius: 10, overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  resultCover: {
    width: 32, height: 44, borderRadius: 3,
  },
  resultCoverEmpty: {
    alignItems: 'center', justifyContent: 'center',
  },
  resultTitle: { fontSize: 13, fontWeight: '600' },
  resultMeta: { fontSize: 11, marginTop: 2 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  submit: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  submitText: { fontSize: 14, fontWeight: '700' },
  scanBtn: {
    width: 44, borderWidth: 1, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  scanError: { fontSize: 11, marginTop: 4 },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  scannerFrame: {
    width: 240, height: 140, borderRadius: 12,
    borderWidth: 2, borderColor: '#fff',
  },
  scannerHint: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center',
  },
  scannerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  scannerLoadingText: { color: '#fff', fontSize: 14 },
  scannerClose: {
    position: 'absolute', right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  scannerFooter: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    alignItems: 'center', paddingHorizontal: 24,
  },
  scannerFallbackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(245,240,232,0.35)',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, minHeight: 44,
  },
  scannerFallbackText: { color: '#F5F0E8', fontSize: 13, fontWeight: '600' },
  scanDebug: {
    position: 'absolute', left: 16,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, gap: 2,
  },
  scanDebugText: { color: '#4ecb91', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
