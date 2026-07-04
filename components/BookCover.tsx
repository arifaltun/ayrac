import { useState } from 'react';
import { Image, Text, View } from 'react-native';

// Tek kitap kapağı: görsel varsa fotoğraf, yoksa sırtlı renk bloğu + baş harf.
// Tüm ekranlar aynı bileşeni kullanır ki kapaklar her yerde aynı görünsün.
export function BookCover({ color, coverImage, title, size = 44, radius = 3 }: {
  color: string;
  coverImage?: string;
  title?: string;
  size?: number;
  radius?: number;
}) {
  // Uzak kapak 404/çevrimdışı olursa boş kutu yerine renkli fallback'e düş
  const [loadFailed, setLoadFailed] = useState(false);
  const width = size * 0.7;
  if (coverImage && !loadFailed) {
    return (
      <Image
        source={{ uri: coverImage }}
        style={{ width, height: size, borderRadius: radius }}
        resizeMode="cover"
        onError={() => setLoadFailed(true)}
      />
    );
  }
  const letter = title?.trim()[0]?.toUpperCase();
  return (
    <View
      style={{
        width,
        height: size,
        borderRadius: radius,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: Math.max(2, Math.round(size * 0.05)),
          backgroundColor: 'rgba(0,0,0,0.2)',
        }}
      />
      {letter ? (
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: size * 0.34, fontWeight: '700' }}>
          {letter}
        </Text>
      ) : null}
    </View>
  );
}
