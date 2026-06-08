import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useBooks } from '@/context/BooksContext';
import { usePro } from '@/context/ProContext';
import { fonts, BOOK_COLORS } from '@/constants/tokens';

function BookCover({ title, color, coverImage }: { title: string; color: string; coverImage?: string }) {
  const letter = title.trim()[0]?.toUpperCase() ?? 'K';
  if (coverImage) {
    return (
      <View style={styles.coverPreview}>
        <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={styles.coverPreview}>
      <View style={[styles.coverSpine, { backgroundColor: color }]} />
      <View style={[styles.coverBody, { backgroundColor: color }]}>
        <Text style={styles.coverLetter}>{letter}</Text>
      </View>
    </View>
  );
}

type Status = 'reading' | 'finished' | 'want';

type OLResult = {
  title: string;
  author: string;
  pages: number;
  coverId: number | null;
};

async function searchOpenLibrary(query: string): Promise<OLResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,number_of_pages_median,cover_i&limit=5`;
  const res = await fetch(url);
  const json = await res.json();
  return (json.docs ?? []).map((doc: any) => ({
    title: doc.title ?? '',
    author: doc.author_name?.[0] ?? '',
    pages: doc.number_of_pages_median ?? 0,
    coverId: doc.cover_i ?? null,
  }));
}

async function lookupByISBN(isbn: string): Promise<OLResult | null> {
  const url = `https://openlibrary.org/search.json?isbn=${isbn}&fields=title,author_name,number_of_pages_median,cover_i&limit=1`;
  const res = await fetch(url);
  const json = await res.json();
  const doc = json.docs?.[0];
  if (!doc) return null;
  return {
    title: doc.title ?? '',
    author: doc.author_name?.[0] ?? '',
    pages: doc.number_of_pages_median ?? 0,
    coverId: doc.cover_i ?? null,
  };
}

function coverUrl(coverId: number) {
  return `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`;
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
  const [pickerVisible, setPickerVisible] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const scannedRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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
    setResults([]);
  };

  const pickFromGallery = async () => {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });
    if (!result.canceled) setCoverImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });
    if (!result.canceled) setCoverImage(result.assets[0].uri);
  };

  const openScanner = async () => {
    setScanError('');
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

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanLoading(true);
    try {
      const item = await lookupByISBN(data);
      if (item && item.title) {
        selectResult(item);
        setScannerOpen(false);
      } else {
        setScanError('Kitap bulunamadı. ISBN: ' + data);
        scannedRef.current = false;
      }
    } catch {
      setScanError('Bağlantı hatası, tekrar deneyin.');
      scannedRef.current = false;
    } finally {
      setScanLoading(false);
    }
  };

  const canSubmit = title.trim().length > 0 && author.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (!isPro && books.length >= 5) { showPaywall('book_limit'); return; }
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Photo picker modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerVisible(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: t.surface }]}>
            <Text style={[styles.pickerTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>Kapak fotoğrafı</Text>
            <Pressable style={[styles.pickerOption, { borderColor: t.border }]} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={20} color={t.fg} />
              <Text style={[styles.pickerOptionText, { color: t.fg }]}>Fotoğraf çek</Text>
            </Pressable>
            <Pressable style={[styles.pickerOption, { borderColor: t.border }]} onPress={pickFromGallery}>
              <Ionicons name="image-outline" size={20} color={t.fg} />
              <Text style={[styles.pickerOptionText, { color: t.fg }]}>Galeriden seç</Text>
            </Pressable>
            {coverImage && (
              <Pressable style={styles.pickerRemove} onPress={() => { setCoverImage(undefined); setPickerVisible(false); }}>
                <Text style={[styles.pickerRemoveText, { color: t.orange }]}>Fotoğrafı kaldır</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Barcode scanner modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'isbn13'] }}
            onBarcodeScanned={scanLoading ? undefined : handleBarcode}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>Kitabın barkodunu çerçeveye getir</Text>
          </View>
          {scanLoading && (
            <View style={styles.scannerLoadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.scannerLoadingText}>Kitap aranıyor…</Text>
            </View>
          )}
          <Pressable
            style={[styles.scannerClose, { top: insets.top + 12 }]}
            onPress={() => setScannerOpen(false)}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>
      </Modal>

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

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 10 }}
        >
          {/* Cover preview + color picker */}
          <View style={styles.coverRow}>
            <Pressable onPress={() => setPickerVisible(true)} style={{ position: 'relative' }}>
              <BookCover title={title} color={color} coverImage={coverImage} />
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
                    onPress={() => setColor(c)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      color === c && { borderWidth: 2.5, borderColor: t.fg },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

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
                        source={{ uri: coverUrl(item.coverId) }}
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
                  onPress={() => setStatus(k)}
                  style={[
                    styles.statusBtn,
                    {
                      borderColor: status === k ? t.primary : t.border,
                      backgroundColor: status === k ? t.primarySoft : t.bgSoft,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: status === k ? t.fg : t.muted }}>
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
                  <Pressable key={i} onPress={() => setRating(i === rating ? 0 : i)}>
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
          <Pressable
            style={[styles.submit, { backgroundColor: canSubmit ? t.primary : t.border }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={[styles.submitText, { color: canSubmit ? '#000' : t.muted }]}>
              Kitabı ekle
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  coverRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  coverPreview: { flexDirection: 'row', height: 76, borderRadius: 4, overflow: 'hidden' },
  coverImage: { width: 57, height: 76, borderRadius: 4 },
  coverSpine: { width: 4, opacity: 0.7 },
  coverBody: {
    width: 53, alignItems: 'center', justifyContent: 'center',
    borderTopRightRadius: 4, borderBottomRightRadius: 4,
  },
  coverLetter: { color: 'rgba(255,255,255,0.85)', fontSize: 26, fontWeight: '700' },
  coverEditBadge: {
    position: 'absolute', bottom: 3, right: 3,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
  },
  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 10,
  },
  pickerTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  pickerOptionText: { fontSize: 15, fontWeight: '500' },
  pickerRemove: { alignItems: 'center', paddingVertical: 10 },
  pickerRemoveText: { fontSize: 13, fontWeight: '600' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 },
  colorSwatch: { width: 22, height: 22, borderRadius: 11 },
  fieldLabel: {
    fontSize: 9, fontWeight: '600', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 4,
  },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13,
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
  submit: { padding: 13, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  submitText: { fontSize: 13, fontWeight: '700' },
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
});
