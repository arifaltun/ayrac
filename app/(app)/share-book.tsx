import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { useBooks } from '@/context/BooksContext';
import { fonts } from '@/constants/tokens';

const { width: W } = Dimensions.get('window');
const CARD_W = W - 48;
const STORY_H = CARD_W * (16 / 9);
const FEED_H = CARD_W;

type Format = 'story' | 'feed';

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= value ? 'star' : 'star-outline'}
          size={size}
          color={i <= value ? '#f5a124' : 'rgba(245,240,232,0.25)'}
        />
      ))}
    </View>
  );
}

function ShareCard({ format, title, author, rating, color, coverImage }: {
  format: Format;
  title: string;
  author: string;
  rating: number;
  color: string;
  coverImage?: string;
}) {
  const cardH = format === 'story' ? STORY_H : FEED_H;

  return (
    <View style={[styles.card, { height: cardH, backgroundColor: '#0a0a0a' }]}>
      {/* Background accent */}
      <View style={[styles.cardAccent, { backgroundColor: color, opacity: 0.12 }]} />

      {/* Top label */}
      <View style={styles.cardTop}>
        <View style={styles.appBadge}>
          <Ionicons name="bookmark" size={10} color="#000" />
          <Text style={styles.appBadgeText}>ayraç</Text>
        </View>
      </View>

      {/* Center content */}
      <View style={[styles.cardCenter, format === 'feed' && { paddingVertical: 20 }]}>
        {coverImage ? (
          <Image
            source={{ uri: coverImage }}
            style={[styles.cardCover, format === 'story' && { width: 110, height: 160 }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[
            styles.cardCoverPlaceholder,
            { backgroundColor: color },
            format === 'story' && { width: 110, height: 160 },
          ]}>
            <View style={styles.cardCoverSpine} />
            <Text style={styles.cardCoverLetter}>{title[0]?.toUpperCase() ?? 'K'}</Text>
          </View>
        )}

        <View style={styles.cardText}>
          <Text style={[styles.cardFinished, { color }]}>BİTİRDİM</Text>
          <Text style={styles.cardTitle} numberOfLines={format === 'feed' ? 2 : 3}>
            {title}
          </Text>
          <Text style={styles.cardAuthor} numberOfLines={1}>{author}</Text>
          {rating > 0 && (
            <View style={{ marginTop: 10 }}>
              <Stars value={rating} size={format === 'feed' ? 13 : 16} />
            </View>
          )}
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.cardBottom}>
        <Text style={styles.cardBottomText}>ayraç · okuma takip</Text>
      </View>
    </View>
  );
}

export default function ShareBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books } = useBooks();

  const book = books.find((b) => b.id === id);
  const [format, setFormat] = useState<Format>('story');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  if (!book) { router.back(); return null; }

  const capture = async () => {
    if (!viewShotRef.current?.capture) return null;
    return await viewShotRef.current.capture();
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      const uri = await capture();
      if (!uri) return;
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToGallery = async () => {
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
      const uri = await capture();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <Text style={styles.headerTitle}>Paylaş</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Format toggle */}
      <View style={styles.formatToggle}>
        {(['story', 'feed'] as Format[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFormat(f)}
            style={[styles.formatBtn, format === f && styles.formatBtnActive]}
          >
            <Text style={[styles.formatBtnText, format === f && styles.formatBtnTextActive]}>
              {f === 'story' ? 'Story (9:16)' : 'Feed (1:1)'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Card preview */}
      <View style={styles.previewContainer}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <ShareCard
            format={format}
            title={book.title}
            author={book.author}
            rating={book.rating}
            color={book.color}
            coverImage={book.coverImage}
          />
        </ViewShot>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {saved && (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4ecb91" />
            <Text style={styles.savedText}>Galeriye kaydedildi</Text>
          </View>
        )}
        <Pressable
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={handleShare}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="share-outline" size={16} color="#000" />
              <Text style={styles.actionBtnPrimaryText}>Paylaş</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={handleSaveToGallery}
          disabled={loading}
        >
          <Ionicons name="download-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.actionBtnSecondaryText}>Galeriye kaydet</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: '#F5F0E8',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.serifMedium,
  },
  formatToggle: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
  },
  formatBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
  },
  formatBtnActive: { backgroundColor: '#222' },
  formatBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  formatBtnTextActive: { color: '#F5F0E8' },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Card styles
  card: {
    width: CARD_W,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 24,
  },
  cardAccent: {
    ...StyleSheet.absoluteFillObject as any,
    borderRadius: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  appBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  appBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fonts.serifMedium,
  },
  cardCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 28,
  },
  cardCover: {
    width: 80,
    height: 116,
    borderRadius: 6,
  },
  cardCoverPlaceholder: {
    width: 80,
    height: 116,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardCoverSpine: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cardCoverLetter: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 32,
    fontWeight: '700',
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardFinished: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  cardTitle: {
    color: '#F5F0E8',
    fontSize: 22,
    fontFamily: fonts.serif,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  cardAuthor: {
    color: 'rgba(245,240,232,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  cardBottom: {
    alignItems: 'flex-end',
  },
  cardBottomText: {
    color: 'rgba(245,240,232,0.2)',
    fontSize: 10,
    letterSpacing: 1,
  },
  // Actions
  actions: {
    gap: 10,
    marginTop: 16,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  savedText: {
    color: '#4ecb91',
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  actionBtnPrimary: { backgroundColor: '#F5F0E8' },
  actionBtnPrimaryText: { color: '#000', fontSize: 15, fontWeight: '700' },
  actionBtnSecondary: { backgroundColor: '#111' },
  actionBtnSecondaryText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
});
