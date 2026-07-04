import { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  ActivityIndicator, Image, ScrollView, Platform, Alert, Linking,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
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
type CardVariant = 'editorial' | 'journal' | 'quote' | 'stats' | 'minimal';

const PALETTE = [
  '#7c3aed', '#1d9e75', '#d85a30', '#3b82f6',
  '#ec4899', '#f5a623', '#06b6d4', '#8b5a3c',
  '#ef4444', '#10b981', '#a855f7', '#6366f1',
];

const SIGNATURE = 'ayraç · okuma günlüğü';

type BookStats = {
  days: number;
  totalSeconds: number;
  sessionCount: number;
  avgMinutes: number;
};

type CardProps = {
  format: Format;
  title: string;
  author: string;
  rating: number;
  accentColor: string;
  coverImage?: string;
  review?: string;
  quote?: string;
  dateLabel: string;
  pages: number;
  genre: string;
  stats: BookStats;
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} sa ${m} dk`;
  if (m > 0) return `${m} dk`;
  return `${seconds} sn`;
}

/* ---------- ortak parçalar ---------- */

// Puan: "7.5 / 10" serif dizgi — capture edildiği için renkler kart varyantından gelir
function Rating({ value, color, subColor, size = 16 }: {
  value: number; color: string; subColor: string; size?: number;
}) {
  if (value <= 0) return null;
  return (
    <Text style={{ fontFamily: fonts.serif, fontSize: size, color, letterSpacing: -0.3 }}>
      {value.toFixed(1)}
      <Text style={{ fontSize: Math.round(size * 0.62), color: subColor, letterSpacing: 0 }}> / 10</Text>
    </Text>
  );
}

// Kelime ortasından kırılma yasak: sığmayan başlık kademeli küçülür
const NO_WORD_BREAK = { adjustsFontSizeToFit: true, minimumFontScale: 0.55 } as const;

// Android'de adjustsFontSizeToFit + sabit lineHeight, küçülen metni dikey kırpıyor
// (bilinen RN davranışı) — Android'de satır yüksekliği serbest bırakılır
const fitLineHeight = (lh: number) => (Platform.OS === 'android' ? undefined : lh);

// İnce grain dokusu (SVG pattern) — düz dijital zemini kırar
function Grain({ color, opacity, id }: { color: string; opacity: number; id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse">
          <Circle cx="1" cy="1.5" r="0.6" fill={color} />
          <Circle cx="4.5" cy="4" r="0.45" fill={color} />
          <Circle cx="2.5" cy="6" r="0.5" fill={color} />
          <Circle cx="6" cy="1" r="0.4" fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </Svg>
  );
}

// Kitap objesi: 2:3, yumuşak köşe, dağınık gölge, cilt çizgisi.
// Kapak yoksa: kitap sırtı hissi — başlık küçük serif dizgiyle dikey yazılır.
function CoverArt({ title, accentColor, coverImage, w, lightShadow }: {
  title: string; accentColor: string; coverImage?: string; w: number; lightShadow?: boolean;
}) {
  const h = w * 1.5;
  const radius = Math.max(8, Math.round(w * 0.09));
  const spineW = Math.max(4, Math.round(w * 0.06));
  return (
    <View style={{
      width: w, height: h, borderRadius: radius,
      backgroundColor: coverImage ? '#1a1712' : accentColor,
      shadowColor: '#000',
      shadowOpacity: lightShadow ? 0.25 : 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 9 },
      elevation: 9,
    }}>
      <View style={{ flex: 1, borderRadius: radius, overflow: 'hidden' }}>
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {/* Sırt süslemesi: üst/alt ince çizgiler */}
            <View style={{ position: 'absolute', top: h * 0.08, left: spineW + 5, right: 6, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <View style={{ position: 'absolute', bottom: h * 0.08, left: spineW + 5, right: 6, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <Text
              numberOfLines={2}
              {...NO_WORD_BREAK}
              style={{
                transform: [{ rotate: '90deg' }],
                width: h * 0.78,
                textAlign: 'center',
                fontFamily: fonts.serifMedium,
                fontSize: Math.max(9, Math.round(w * 0.15)),
                lineHeight: fitLineHeight(Math.max(11, Math.round(w * 0.19))),
                color: 'rgba(255,255,255,0.92)',
                letterSpacing: 0.4,
              }}
            >
              {title}
            </Text>
          </View>
        )}
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: spineW, backgroundColor: 'rgba(0,0,0,0.22)' }} />
        <View style={{ position: 'absolute', left: spineW, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} />
      </View>
    </View>
  );
}

function AyracBadge({ fg, bg }: { fg: string; bg: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: fg, paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 20, alignSelf: 'flex-start',
    }}>
      <Ionicons name="bookmark" size={10} color={bg} />
      <Text style={{ color: bg, fontSize: 10, fontWeight: '700', fontFamily: fonts.serifMedium }}>ayraç</Text>
    </View>
  );
}

function Signature({ color }: { color: string }) {
  return (
    <Text style={{ color, fontSize: 9, letterSpacing: 1.5, fontWeight: '600' }}>{SIGNATURE}</Text>
  );
}

function Stamp({ color, date }: { color: string; date: string }) {
  return (
    <View style={{
      transform: [{ rotate: '-7deg' }],
      borderWidth: 2, borderColor: color, borderRadius: 8, padding: 3, opacity: 0.92,
    }}>
      <View style={{
        borderWidth: 1, borderColor: color, borderRadius: 5,
        paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center',
      }}>
        <Text style={{ color, fontSize: 13, fontWeight: '800', letterSpacing: 3 }}>BİTİRDİM</Text>
        <Text style={{ color, fontSize: 8, letterSpacing: 1.5, marginTop: 2, fontWeight: '600' }}>{date}</Text>
      </View>
    </View>
  );
}

function Ribbon({ color, left = 26 }: { color: string; left?: number }) {
  return (
    <Svg width={34} height={70} viewBox="0 0 34 70" style={{ position: 'absolute', top: 0, left }}>
      <Path d="M0 0 H34 V70 L17 54 L0 70 Z" fill={color} />
    </Svg>
  );
}

/* ---------- 1 · EDİTÖRYEL — dergi sayfası ---------- */

function EditorialCard({ format, title, author, rating, accentColor, coverImage, review, dateLabel }: CardProps) {
  const isStory = format === 'story';
  const ink = '#221b12';
  const sub = 'rgba(34,27,18,0.55)';
  const faint = 'rgba(34,27,18,0.35)';

  return (
    <View style={[s.card, { height: isStory ? STORY_H : FEED_H, backgroundColor: '#F4EEE2' }]}>
      <Grain id="g-edit" color={ink} opacity={0.045} />
      <View style={{ flex: 1, padding: isStory ? 28 : 22 }}>
        <View style={s.rowBetween}>
          <Text style={[s.mastText, { color: ink }]}>{SIGNATURE.toUpperCase()}</Text>
          <Text style={[s.mastText, { color: sub }]}>{dateLabel.toUpperCase()}</Text>
        </View>
        <View style={{ height: 2, backgroundColor: ink, marginTop: 8 }} />
        <View style={{ height: 1, backgroundColor: ink, marginTop: 2, opacity: 0.5 }} />

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.kicker, { color: accentColor }]}>BİTİRDİM</Text>
              <View style={{ width: 26, height: 2, backgroundColor: accentColor, marginTop: 5, marginBottom: 12 }} />
              <Text
                style={{ fontFamily: fonts.serif, color: ink, fontSize: isStory ? 30 : 20, lineHeight: fitLineHeight(isStory ? 36 : 25), letterSpacing: -0.5 }}
                numberOfLines={isStory ? 4 : 2}
                {...NO_WORD_BREAK}
              >
                {title}
              </Text>
              <Text style={{ fontFamily: fonts.serifRegular, color: sub, fontSize: isStory ? 14 : 12, marginTop: 8 }} numberOfLines={1}>
                {author}
              </Text>
              {rating > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Rating value={rating} color={ink} subColor={sub} size={isStory ? 18 : 14} />
                </View>
              )}
            </View>
            <View style={{ transform: [{ rotate: '2.5deg' }] }}>
              <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={isStory ? 100 : 70} lightShadow />
            </View>
          </View>

          {review ? (
            <View style={{ marginTop: isStory ? 26 : 14 }}>
              <Text style={{ fontFamily: fonts.serif, color: accentColor, fontSize: 46, lineHeight: 46, marginBottom: -18 }}>“</Text>
              <Text
                style={{ fontFamily: fonts.serifRegular, color: ink, fontSize: isStory ? 15 : 12, lineHeight: isStory ? 25 : 18, letterSpacing: 0.1 }}
                numberOfLines={isStory ? 5 : 2}
              >
                {review}”
              </Text>
              <Text style={{ color: sub, fontSize: 9, letterSpacing: 1.5, marginTop: 8, fontWeight: '600' }}>— OKUR NOTU</Text>
            </View>
          ) : null}
        </View>

        <View>
          <View style={{ height: 1, backgroundColor: ink, opacity: 0.35, marginBottom: 10 }} />
          <View style={s.rowBetween}>
            <AyracBadge fg={ink} bg="#F4EEE2" />
            <Text style={{ color: faint, fontSize: 9, letterSpacing: 2, fontWeight: '600' }}>SAYFA · SON</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ---------- 2 · GÜNLÜK — kayıt defteri ---------- */

function JournalField({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: 'rgba(42,32,20,0.3)', paddingBottom: 6 }}>
      <Text style={{ color: sub, fontSize: 8, letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

function JournalCard({ format, title, author, rating, accentColor, coverImage, dateLabel, pages, genre }: CardProps) {
  const isStory = format === 'story';
  const ink = '#2a2014';
  const sub = 'rgba(42,32,20,0.5)';
  const valueStyle = { fontFamily: fonts.serifMedium, color: ink, fontSize: isStory ? 15 : 12 } as const;

  // Boş alan "—" ile doldurulmaz: yalnızca gerçek veriler satıra girer
  const fields: { label: string; node: React.ReactNode }[] = [
    { label: 'BİTİRME TARİHİ', node: <Text style={valueStyle}>{dateLabel}</Text> },
    ...(pages > 0
      ? [{ label: 'SAYFA', node: <Text style={valueStyle}>{pages.toLocaleString('tr-TR')}</Text> }]
      : []),
    ...(genre
      ? [{ label: 'TÜR', node: <Text style={valueStyle} numberOfLines={1}>{genre}</Text> }]
      : []),
    ...(rating > 0
      ? [{ label: 'PUAN', node: <Rating value={rating} color={ink} subColor={sub} size={isStory ? 17 : 13} /> }]
      : []),
  ];
  const fieldRows: typeof fields[] = [];
  for (let i = 0; i < fields.length; i += 2) fieldRows.push(fields.slice(i, i + 2));

  return (
    <View style={[s.card, { height: isStory ? STORY_H : FEED_H, backgroundColor: '#EFE5CF' }]}>
      <Grain id="g-journal" color={ink} opacity={0.05} />
      <View style={{ flex: 1, padding: isStory ? 28 : 22 }}>
        <Text style={{ color: ink, fontSize: 9, letterSpacing: 3, fontWeight: '700', textAlign: 'center' }}>
          {SIGNATURE.toUpperCase()}
        </Text>
        <View style={{ height: 2, backgroundColor: accentColor, marginTop: 8, opacity: 0.75 }} />
        <View style={{ height: 1, backgroundColor: accentColor, marginTop: 2, opacity: 0.45 }} />

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontFamily: fonts.serif, color: ink, fontSize: isStory ? 24 : 17, lineHeight: fitLineHeight(isStory ? 30 : 21), letterSpacing: -0.4 }}
                numberOfLines={isStory ? 3 : 2}
                {...NO_WORD_BREAK}
              >
                {title}
              </Text>
              <Text style={{ fontFamily: fonts.serifRegular, color: sub, fontSize: isStory ? 13 : 11, marginTop: 6 }} numberOfLines={1}>
                {author}
              </Text>
            </View>
            <View style={{ transform: [{ rotate: '-3.5deg' }] }}>
              <View style={{
                padding: 5, backgroundColor: '#FCF9F2', borderRadius: 4,
                shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 }, elevation: 6,
              }}>
                <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={isStory ? 70 : 50} lightShadow />
              </View>
            </View>
          </View>

          {/* Kayıt satırları — yalnızca dolu alanlar */}
          <View style={{ gap: isStory ? 16 : 10, marginTop: isStory ? 26 : 14 }}>
            {fieldRows.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 16 }}>
                {row.map((f) => (
                  <JournalField key={f.label} label={f.label} sub={sub}>
                    {f.node}
                  </JournalField>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={[s.rowBetween, { alignItems: 'flex-end' }]}>
          <AyracBadge fg={ink} bg="#EFE5CF" />
          <Stamp color={accentColor} date={dateLabel} />
        </View>
      </View>
    </View>
  );
}

/* ---------- 3 · ALINTI — kitaptan bir cümle merkezde ---------- */

function QuoteCard({ format, title, author, rating, accentColor, coverImage, review, quote, dateLabel }: CardProps) {
  const isStory = format === 'story';
  const ink = '#221b12';
  const sub = 'rgba(34,27,18,0.55)';
  const text = quote || review || '';

  return (
    <View style={[s.card, { height: isStory ? STORY_H : FEED_H, backgroundColor: '#F6F0E4' }]}>
      <Grain id="g-quote" color={ink} opacity={0.04} />
      <View style={{ flex: 1, padding: isStory ? 30 : 24 }}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: accentColor }]}>BİTİRDİM</Text>
          <AyracBadge fg={ink} bg="#F6F0E4" />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{
            fontFamily: fonts.serif, color: accentColor,
            fontSize: isStory ? 88 : 56, lineHeight: isStory ? 88 : 56,
            marginBottom: isStory ? -30 : -20,
          }}>
            “
          </Text>
          {/* Uzun alıntı ortadan kesilip "…”" kalmasın: satıra sığmazsa kademeli küçülür */}
          <Text
            style={{
              fontFamily: fonts.serif, color: ink,
              fontSize: isStory ? 24 : 16, lineHeight: fitLineHeight(isStory ? 36 : 24),
              letterSpacing: -0.2,
            }}
            numberOfLines={isStory ? 8 : 4}
            {...NO_WORD_BREAK}
          >
            {text}”
          </Text>
          {/* Alıntı yoksa gösterilen not, kitap alıntısı sanılmasın */}
          {!quote && !!review && (
            <Text style={{ color: sub, fontSize: 9, letterSpacing: 1.5, marginTop: 8, fontWeight: '600' }}>
              — OKUR NOTU
            </Text>
          )}
          <View style={{ width: 32, height: 2, backgroundColor: accentColor, marginTop: isStory ? 22 : 12, opacity: 0.85 }} />
          <Text style={{ fontFamily: fonts.serifRegular, color: ink, fontSize: isStory ? 14 : 12, marginTop: 10 }} numberOfLines={1} {...NO_WORD_BREAK}>
            {title}
          </Text>
          <Text style={{ color: sub, fontSize: isStory ? 12 : 10, marginTop: 3 }} numberOfLines={1}>{author}</Text>
        </View>

        <View style={[s.rowBetween, { alignItems: 'flex-end' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={isStory ? 44 : 36} lightShadow />
            <View style={{ gap: 4, paddingBottom: 2 }}>
              {rating > 0 && <Rating value={rating} color={ink} subColor={sub} size={13} />}
              <Signature color={sub} />
            </View>
          </View>
          <Text style={{ color: sub, fontSize: 9, letterSpacing: 1 }}>{dateLabel}</Text>
        </View>
      </View>
    </View>
  );
}

/* ---------- 4 · İSTATİSTİK — bu kitabın okuma verisi ---------- */

function StatBlock({ value, label, accent, cream }: { value: string; label: string; accent: string; cream: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={{ fontFamily: fonts.serif, color: accent, fontSize: 24, letterSpacing: -0.5 }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ color: cream, fontSize: 8, letterSpacing: 1.8, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function StatsCard({ format, title, author, rating, accentColor, coverImage, dateLabel, stats }: CardProps) {
  const isStory = format === 'story';
  const cream = '#F5F0E8';
  const creamSub = 'rgba(245,240,232,0.55)';
  const creamFaint = 'rgba(245,240,232,0.35)';

  // Yalnızca gerçek veriler blok olur; "—" yok.
  // Bitirme süresi yalnız gerçek okuma verisi varken gösterilir —
  // geçmişe dönük "Bitti" eklenen kitapta "1 gün" yanıltıcı olur.
  const blocks: { v: string; l: string }[] = [
    ...(stats.days > 0 && stats.totalSeconds > 0 ? [{ v: `${stats.days} gün`, l: 'BİTİRME SÜRESİ' }] : []),
    ...(stats.totalSeconds > 0 ? [{ v: formatDuration(stats.totalSeconds), l: 'TOPLAM OKUMA' }] : []),
    ...(stats.sessionCount > 0 ? [{ v: `${stats.sessionCount}`, l: 'OKUMA OTURUMU' }] : []),
    ...(stats.avgMinutes > 0 ? [{ v: `${stats.avgMinutes} dk`, l: 'GÜNLÜK ORTALAMA' }] : []),
  ];
  const blockRows: typeof blocks[] = [];
  for (let i = 0; i < blocks.length; i += 2) blockRows.push(blocks.slice(i, i + 2));

  return (
    <View style={[s.card, { height: isStory ? STORY_H : FEED_H, backgroundColor: '#14110b' }]}>
      <Grain id="g-stats" color={cream} opacity={0.05} />
      <View style={{ flex: 1, padding: isStory ? 28 : 22 }}>
        <View style={s.rowBetween}>
          <Text style={[s.kicker, { color: accentColor }]}>BİTİRDİM</Text>
          <AyracBadge fg={cream} bg="#14110b" />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontFamily: fonts.serif, color: cream, fontSize: isStory ? 26 : 18, lineHeight: fitLineHeight(isStory ? 32 : 23), letterSpacing: -0.5 }}
                numberOfLines={isStory ? 3 : 2}
                {...NO_WORD_BREAK}
              >
                {title}
              </Text>
              <Text style={{ color: creamSub, fontSize: isStory ? 12 : 10, marginTop: 6 }} numberOfLines={1}>{author}</Text>
              {rating > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Rating value={rating} color={cream} subColor={creamSub} size={isStory ? 16 : 13} />
                </View>
              )}
            </View>
            <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={isStory ? 76 : 54} />
          </View>

          {/* Okuma verisi — yalnızca dolu bloklar */}
          <View style={{
            marginTop: isStory ? 28 : 14, gap: isStory ? 20 : 10,
            borderTopWidth: 1, borderTopColor: 'rgba(245,240,232,0.15)',
            paddingTop: isStory ? 22 : 12,
          }}>
            {blockRows.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 16 }}>
                {row.map((b) => (
                  <StatBlock key={b.l} value={b.v} label={b.l} accent={accentColor} cream={creamSub} />
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={s.rowBetween}>
          <Signature color={creamFaint} />
          <Text style={{ color: creamFaint, fontSize: 9, letterSpacing: 1 }}>{dateLabel}</Text>
        </View>
      </View>
    </View>
  );
}

/* ---------- 5 · MİNİMAL — koyu, rafine, kapak + tek satır ---------- */

function MinimalCard({ format, title, author, rating, accentColor, coverImage, dateLabel }: CardProps) {
  const isStory = format === 'story';
  const cream = '#F5F0E8';
  const creamSub = 'rgba(245,240,232,0.55)';
  const creamFaint = 'rgba(245,240,232,0.35)';

  return (
    <View style={[s.card, { height: isStory ? STORY_H : FEED_H, backgroundColor: '#131009' }]}>
      <Grain id="g-min" color={cream} opacity={0.045} />
      <Ribbon color={accentColor} left={isStory ? 30 : 24} />
      <View style={{ flex: 1, padding: isStory ? 28 : 22, alignItems: 'center', justifyContent: 'center' }}>
        <CoverArt title={title} accentColor={accentColor} coverImage={coverImage} w={isStory ? 128 : 84} />
        <Text style={[s.kicker, { color: accentColor, marginTop: isStory ? 30 : 16 }]}>BİTİRDİM</Text>
        <Text
          style={{
            fontFamily: fonts.serif, color: cream, textAlign: 'center',
            fontSize: isStory ? 26 : 18, lineHeight: fitLineHeight(isStory ? 33 : 23),
            letterSpacing: -0.5, marginTop: 10, maxWidth: '88%',
          }}
          numberOfLines={2}
          {...NO_WORD_BREAK}
        >
          {title}
        </Text>
        <Text style={{ color: creamSub, fontSize: isStory ? 12 : 10, marginTop: 6 }} numberOfLines={1}>{author}</Text>
        {rating > 0 && (
          <View style={{ marginTop: 12 }}>
            <Rating value={rating} color={cream} subColor={creamSub} size={isStory ? 18 : 14} />
          </View>
        )}
      </View>
      <View style={[s.rowBetween, { position: 'absolute', left: isStory ? 28 : 22, right: isStory ? 28 : 22, bottom: isStory ? 24 : 18 }]}>
        <Signature color={creamFaint} />
        <Text style={{ color: creamFaint, fontSize: 9, letterSpacing: 1 }}>{dateLabel}</Text>
      </View>
    </View>
  );
}

function ShareCard(props: CardProps & { variant: CardVariant }) {
  const { variant, ...rest } = props;
  switch (variant) {
    case 'journal': return <JournalCard {...rest} />;
    case 'quote': return <QuoteCard {...rest} />;
    case 'stats': return <StatsCard {...rest} />;
    case 'minimal': return <MinimalCard {...rest} />;
    default: return <EditorialCard {...rest} />;
  }
}

/* ---------- ekran ---------- */

const VARIANTS: { key: CardVariant; label: string }[] = [
  { key: 'editorial', label: 'Editöryel' },
  { key: 'journal', label: 'Günlük' },
  { key: 'quote', label: 'Alıntı' },
  { key: 'stats', label: 'İstatistik' },
  { key: 'minimal', label: 'Minimal' },
];

export default function ShareBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books, sessions } = useBooks();

  const book = books.find((b) => b.id === id);
  const [format, setFormat] = useState<Format>('story');
  const [variant, setVariant] = useState<CardVariant>('editorial');
  const [accentColor, setAccentColor] = useState(book?.color ?? PALETTE[0]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewArea, setPreviewArea] = useState({ w: 0, h: 0 });
  // Kilitli varyanta dokununca nedenini söyleyen geçici ipucu (durum satırında)
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewShotRef = useRef<ViewShot>(null);

  const showHint = (msg: string) => {
    setStatusHint(msg);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setStatusHint(null), 3000);
  };

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
  }, []);

  const sv = useSharedValue(0.88);
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: sv.value }] }));

  const animateChange = (cb: () => void) => {
    sv.value = withSequence(
      withSpring(0.93, { damping: 12, stiffness: 500 }),
      withSpring(1, { damping: 10, stiffness: 280 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cb();
  };

  useEffect(() => {
    sv.value = withSpring(1, { damping: 14, stiffness: 140 });
  }, []);

  useEffect(() => {
    if (!book) router.back();
  }, [book, router]);

  if (!book) return null;

  // Küçük ekranlarda (SE/mini) kart, önizleme alanına orantılı küçültülür;
  // capture ölçekten etkilenmez çünkü transform ata görünümde kalır.
  const cardH = format === 'story' ? STORY_H : FEED_H;
  const fitScale = previewArea.h > 0
    ? Math.min(1, previewArea.h / cardH, previewArea.w / CARD_W)
    : 1;

  const dateLabel = new Date(book.finishedAt ?? book.createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Bu kitabın okuma verisi (İstatistik varyantı için)
  const bookSessions = sessions.filter((sess) => sess.bookId === book.id);
  const totalSeconds = book.readingTime ?? bookSessions.reduce((sum, sess) => sum + sess.duration, 0);
  const days = Math.max(1, Math.ceil(((book.finishedAt ?? book.createdAt) - book.createdAt) / 86400000));
  const stats: BookStats = {
    days,
    totalSeconds,
    sessionCount: bookSessions.length,
    avgMinutes: totalSeconds > 0 ? Math.max(1, Math.round(totalSeconds / 60 / days)) : 0,
  };

  // Alıntı varyantı: alıntı da not da yoksa kilitli görünür
  const quoteAvailable = !!(book.quote || book.review);
  // İstatistik varyantı: en az 2 gerçek veri yoksa kilitli
  // (bitirme süresi bloğu gibi burada da days ancak okuma verisiyle sayılır)
  const statsAvailable =
    [stats.days > 0 && stats.totalSeconds > 0, stats.totalSeconds > 0, stats.sessionCount > 0, stats.avgMinutes > 0]
      .filter(Boolean).length >= 2;

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
    } catch {
      Alert.alert('Paylaşılamadı', 'Kart hazırlanırken bir sorun oldu. Tekrar dener misin?');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToGallery = async () => {
    setLoading(true);
    try {
      // Salt-ekleme izni yeterli — tam galeri erişimi istemeye gerek yok
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert(
          'İzin gerekiyor',
          'Kartı kaydetmek için Ayarlar’dan ayraç’a fotoğraf ekleme izni vermen gerekiyor.',
          [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Ayarları aç', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      const uri = await capture();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert('Kaydedilemedi', 'Kart galeriye kaydedilirken bir sorun oldu. Tekrar dener misin?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.backBtn}
          accessibilityLabel="Kapat"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={18} color="rgba(245,240,232,0.7)" />
        </Pressable>
        <Text style={s.headerTitle}>Paylaş</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Format toggle */}
      <View style={s.formatToggle}>
        {(['story', 'feed'] as Format[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => animateChange(() => setFormat(f))}
            style={[s.formatBtn, format === f && s.formatBtnActive]}
          >
            <Text style={[s.formatBtnText, format === f && s.formatBtnTextActive]}>
              {f === 'story' ? 'Story' : 'Feed'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Card preview */}
      <View
        style={s.previewContainer}
        onLayout={(e) => setPreviewArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <View style={{ width: CARD_W * fitScale, height: cardH * fitScale, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ transform: [{ scale: fitScale }] }}>
        <Animated.View style={[cardAnim, s.previewClip]}>
          <ViewShot
            ref={viewShotRef}
            options={{
              format: 'png',
              quality: 1,
              // Çıktı cihazdan bağımsız: Story 1080×1920, Feed 1080×1080
              width: 1080,
              height: format === 'story' ? 1920 : 1080,
            }}
          >
            <ShareCard
              variant={variant}
              format={format}
              title={book.title}
              author={book.author}
              rating={book.rating}
              accentColor={accentColor}
              coverImage={book.coverImage}
              review={book.review}
              quote={book.quote}
              dateLabel={dateLabel}
              pages={book.pages}
              genre={book.genre}
              stats={stats}
            />
          </ViewShot>
        </Animated.View>
        </View>
        </View>
      </View>

      {/* Customization */}
      <View style={s.customPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          {VARIANTS.map(({ key, label }) => {
            const locked = (key === 'quote' && !quoteAvailable) || (key === 'stats' && !statsAvailable);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  if (locked) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    showHint(key === 'quote'
                      ? 'Alıntı ya da not eklersen açılır — kitabı düzenle'
                      : 'Okuma modunda süre biriktikçe açılır');
                    return;
                  }
                  animateChange(() => setVariant(key));
                }}
                style={[s.styleBtn, variant === key && s.styleBtnActive, locked && { opacity: 0.35 }]}
              >
                {locked && <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.5)" />}
                <Text style={[s.styleBtnText, variant === key && s.styleBtnTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.paletteScroll}>
          {PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => animateChange(() => setAccentColor(c))}
              style={[s.paletteSwatch, { backgroundColor: c }, accentColor === c && s.paletteSwatchActive]}
            >
              {accentColor === c && <Ionicons name="checkmark" size={12} color="#fff" />}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        {/* Sabit yükseklikli durum satırı — rozet belirince butonlar zıplamaz */}
        <View style={s.statusSlot}>
          {saved ? (
            <View style={s.savedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#4ecb91" />
              <Text style={s.savedText}>Galeriye kaydedildi</Text>
            </View>
          ) : statusHint ? (
            <Text style={s.hintText}>{statusHint}</Text>
          ) : null}
        </View>
        <Pressable
          style={[s.actionBtn, s.actionBtnPrimary]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleShare(); }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="share-outline" size={16} color="#000" />
              <Text style={s.actionBtnPrimaryText}>Paylaş</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[s.actionBtn, s.actionBtnSecondary]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSaveToGallery(); }}
          disabled={loading}
        >
          <Ionicons name="download-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={s.actionBtnSecondaryText}>Galeriye kaydet</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#F5F0E8', fontSize: 16, fontWeight: '600', fontFamily: fonts.serifMedium },
  formatToggle: {
    flexDirection: 'row', backgroundColor: '#111', borderRadius: 10, padding: 3, marginBottom: 16,
  },
  formatBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  formatBtnActive: { backgroundColor: '#222' },
  formatBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  formatBtnTextActive: { color: '#F5F0E8' },
  previewContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  customPanel: { gap: 10, marginTop: 14 },
  styleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginRight: 8,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#1a1a1a',
  },
  styleBtnActive: { borderColor: '#F5F0E8' },
  styleBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  styleBtnTextActive: { color: '#F5F0E8' },
  paletteScroll: { flexGrow: 0 },
  paletteSwatch: {
    width: 30, height: 30, borderRadius: 15, marginRight: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  paletteSwatchActive: { borderWidth: 2, borderColor: '#fff' },
  // Card shell + ortak tipografi.
  // Kart düz köşeli capture edilir (PNG'de şeffaf köşe kalmasın);
  // yuvarlak köşe yalnız ekran önizlemesinde (previewClip).
  card: { width: CARD_W, overflow: 'hidden' },
  previewClip: { borderRadius: 16, overflow: 'hidden' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 3.5 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mastText: { fontSize: 8, letterSpacing: 1.8, fontWeight: '700' },
  // Actions
  actions: { gap: 8, marginTop: 8 },
  statusSlot: { height: 22, alignItems: 'center', justifyContent: 'center' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  savedText: { color: '#4ecb91', fontSize: 13, fontWeight: '600' },
  hintText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnPrimary: { backgroundColor: '#F5F0E8' },
  actionBtnPrimaryText: { color: '#000', fontSize: 15, fontWeight: '700' },
  actionBtnSecondary: { backgroundColor: '#111' },
  actionBtnSecondaryText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
});
