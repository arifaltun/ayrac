import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
  Image, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useBooks, Book } from '@/context/BooksContext';
import { fonts, BOOK_COLORS } from '@/constants/tokens';

function BookCover({ title, color, coverImage, size = 76 }: { title: string; color: string; coverImage?: string; size?: number }) {
  if (coverImage) {
    return (
      <Image
        source={{ uri: coverImage }}
        style={{ width: size * 0.7, height: size, borderRadius: 4 }}
        resizeMode="cover"
      />
    );
  }
  const letter = title.trim()[0]?.toUpperCase() ?? 'K';
  return (
    <View style={{ width: size * 0.7, height: size, borderRadius: 4, backgroundColor: color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(0,0,0,0.18)' }} />
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: size * 0.35, fontWeight: '700' }}>{letter}</Text>
    </View>
  );
}

type Status = 'reading' | 'finished' | 'want';

export default function EditBookScreen() {
  const { t } = useTheme();
  const { books, updateBook, deleteBook } = useBooks();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const book = books.find((b) => b.id === id);

  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [pages, setPages] = useState(book?.pages ? String(book.pages) : '');
  const [genre, setGenre] = useState(book?.genre ?? '');
  const [status, setStatus] = useState<Status>((book?.status as Status) ?? 'reading');
  const [rating, setRating] = useState(book?.rating ?? 0);
  const [color, setColor] = useState(book?.color ?? BOOK_COLORS[0]);
  const [coverImage, setCoverImage] = useState<string | undefined>(book?.coverImage);
  const [pickerVisible, setPickerVisible] = useState(false);

  if (!book) {
    router.back();
    return null;
  }

  const pickFromGallery = async () => {
    setPickerVisible(false);
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') return;
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
    const { status: perm } = await ImagePicker.requestCameraPermissionsAsync();
    if (perm !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });
    if (!result.canceled) setCoverImage(result.assets[0].uri);
  };

  const handleSave = () => {
    const updated: Book = {
      ...book,
      title: title.trim(),
      author: author.trim(),
      pages: parseInt(pages) || 0,
      genre: genre.trim(),
      status,
      rating: status === 'finished' ? rating : 0,
      color,
      coverImage,
    };
    updateBook(updated);
    router.back();
  };

  const handleDelete = () => {
    deleteBook(book.id);
    router.back();
  };

  const inputStyle = [styles.input, { backgroundColor: t.bgSoft, borderColor: t.border, color: t.fg }];

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

      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: t.surface, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: t.border }]} />

        <View style={styles.titleRow}>
          <Text style={[styles.sheetTitle, { color: t.fg, fontFamily: fonts.serifMedium }]}>
            Kitabı düzenle
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: t.bgSoft }]}
          >
            <Ionicons name="close" size={14} color={t.muted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                      color === c && { borderWidth: 2, borderColor: t.fg },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: t.muted }]}>KİTAP ADI</Text>
            <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholderTextColor={t.mutedStrong} />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: t.muted }]}>YAZAR</Text>
            <TextInput style={inputStyle} value={author} onChangeText={setAuthor} placeholderTextColor={t.mutedStrong} />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>SAYFA</Text>
              <TextInput style={inputStyle} value={pages} onChangeText={setPages} keyboardType="number-pad" placeholderTextColor={t.mutedStrong} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>TÜR</Text>
              <TextInput style={inputStyle} value={genre} onChangeText={setGenre} placeholderTextColor={t.mutedStrong} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: t.muted }]}>DURUM</Text>
            <View style={styles.statusRow}>
              {([['reading', 'Okunuyor'], ['finished', 'Bitti'], ['want', 'Okuyacağım']] as [Status, string][]).map(([k, lbl]) => (
                <Pressable
                  key={k}
                  onPress={() => setStatus(k)}
                  style={[
                    styles.statusBtn,
                    { borderColor: status === k ? t.primary : t.border, backgroundColor: status === k ? t.primarySoft : t.bgSoft },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: status === k ? t.primary : t.muted }}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {status === 'finished' && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: t.muted }]}>PUANIN</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Pressable key={i} onPress={() => setRating(i === rating ? 0 : i)}>
                    <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={28} color={i <= rating ? t.warning : t.border} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {status === 'reading' && (
            <Pressable
              style={[styles.readingModeBtn, { backgroundColor: '#000', borderColor: '#333' }]}
              onPress={() => { handleSave(); router.push({ pathname: '/reading-mode' as any, params: { id: book.id } }); }}
            >
              <Ionicons name="time-outline" size={15} color="#F5F0E8" />
              <Text style={[styles.readingModeTxt, { color: '#F5F0E8' }]}>Okuma modunu başlat</Text>
            </Pressable>
          )}

          <Pressable style={[styles.submit, { backgroundColor: t.primary }]} onPress={handleSave}>
            <Text style={styles.submitText}>Değişiklikleri kaydet</Text>
          </Pressable>

          {status === 'finished' && (
            <Pressable
              style={[styles.shareBtn, { borderColor: t.border }]}
              onPress={() => router.push({ pathname: '/share-book' as any, params: { id: book.id } })}
            >
              <Ionicons name="share-outline" size={14} color={t.muted} />
              <Text style={[styles.shareTxt, { color: t.muted }]}>BİTİRDİM kartını paylaş</Text>
            </Pressable>
          )}

          <Pressable style={[styles.deleteBtn, { borderColor: t.border }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={14} color={t.orange} />
            <Text style={[styles.deleteTxt, { color: t.orange }]}>Kitabı sil</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0 } as any,
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 90,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  coverRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 14 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  colorSwatch: { width: 22, height: 22, borderRadius: 11 },
  coverEditBadge: {
    position: 'absolute', bottom: 3, right: 3,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
  },
  field: { marginBottom: 10 },
  fieldRow: { flexDirection: 'row', gap: 8 },
  fieldLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  starsRow: { flexDirection: 'row', gap: 4 },
  readingModeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 13, borderRadius: 12, borderWidth: 1, marginTop: 8,
  },
  readingModeTxt: { fontSize: 13, fontWeight: '600' },
  submit: { padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  shareTxt: { fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  deleteTxt: { fontSize: 13, fontWeight: '600' },
  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10,
  },
  pickerTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  pickerOptionText: { fontSize: 15, fontWeight: '500' },
  pickerRemove: { alignItems: 'center', paddingVertical: 10 },
  pickerRemoveText: { fontSize: 13, fontWeight: '600' },
});
