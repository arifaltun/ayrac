import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions, Image, Modal, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { fonts } from '@/constants/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
// Kitap kapağı oranı: 2:3 dikey, sabit çerçeve
const FRAME_W = SCREEN_W - 96;
const FRAME_H = FRAME_W * 1.5;

// Kapak fotoğrafı kırpma adımı: kullanıcı fotoğrafı 2:3 çerçeveye
// sürükleyip yakınlaştırarak hizalar; masa/el/ortam karta gelmez.
export function CoverCropper({ uri, onDone, onCancel }: {
  uri: string | null;
  onDone: (croppedUri: string) => void;
  onCancel: () => void;
}) {
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  useEffect(() => {
    if (!uri) return;
    setImgSize(null);
    setBusy(false);
    tx.value = 0;
    ty.value = 0;
    scale.value = 1;
    Image.getSize(
      uri,
      (w, h) => setImgSize({ w, h }),
      () => onCancel(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  // Çerçeveyi her zaman dolduran taban ölçek (cover)
  const base = imgSize ? Math.max(FRAME_W / imgSize.w, FRAME_H / imgSize.h) : 1;
  const dispW = imgSize ? imgSize.w * base : FRAME_W;
  const dispH = imgSize ? imgSize.h * base : FRAME_H;

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      const maxX = Math.max(0, (dispW * scale.value - FRAME_W) / 2);
      const maxY = Math.max(0, (dispH * scale.value - FRAME_H) / 2);
      tx.value = Math.min(maxX, Math.max(-maxX, startX.value + e.translationX));
      ty.value = Math.min(maxY, Math.max(-maxY, startY.value + e.translationY));
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      const s = Math.min(4, Math.max(1, startScale.value * e.scale));
      scale.value = s;
      const maxX = Math.max(0, (dispW * s - FRAME_W) / 2);
      const maxY = Math.max(0, (dispH * s - FRAME_H) / 2);
      tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
      ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const imageAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const confirm = async () => {
    if (!uri || !imgSize || busy) return;
    setBusy(true);
    try {
      const T = base * scale.value;
      const cw = FRAME_W / T;
      const ch = FRAME_H / T;
      // Çerçeve merkezinin orijinal görüntü koordinatındaki yeri
      const cx = imgSize.w / 2 - tx.value / T;
      const cy = imgSize.h / 2 - ty.value / T;
      const originX = Math.max(0, Math.min(imgSize.w - cw, cx - cw / 2));
      const originY = Math.max(0, Math.min(imgSize.h - ch, cy - ch / 2));
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{
          crop: {
            originX: Math.round(originX),
            originY: Math.round(originY),
            width: Math.round(Math.min(cw, imgSize.w)),
            height: Math.round(Math.min(ch, imgSize.h)),
          },
        }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      onDone(result.uri);
    } catch {
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!uri} animationType="fade" onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.container}>
        <Text style={styles.title}>Kapağı çerçeveye hizala</Text>
        <Text style={styles.hint}>Sürükle ve iki parmakla yakınlaştır</Text>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            {uri && imgSize ? (
              <GestureDetector gesture={gesture}>
                <Animated.View style={[{ width: dispW, height: dispH }, imageAnim]}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </Animated.View>
              </GestureDetector>
            ) : (
              <ActivityIndicator size="small" color="rgba(245,240,232,0.6)" />
            )}
          </View>
          {/* Köşe kılavuzları */}
          <View pointerEvents="none" style={[styles.corner, styles.cornerTL]} />
          <View pointerEvents="none" style={[styles.corner, styles.cornerTR]} />
          <View pointerEvents="none" style={[styles.corner, styles.cornerBL]} />
          <View pointerEvents="none" style={[styles.corner, styles.cornerBR]} />
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={busy}
            accessibilityLabel="Kırpmayı iptal et"
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Vazgeç</Text>
          </Pressable>
          <Pressable
            style={styles.confirmBtn}
            onPress={confirm}
            disabled={busy || !imgSize}
            accessibilityLabel="Kapağı kullan"
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.confirmText}>Kapağı kullan</Text>
            )}
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#F5F0E8',
    fontSize: 18,
    fontFamily: fonts.serifMedium,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  hint: {
    color: 'rgba(245,240,232,0.55)',
    fontSize: 13,
    marginBottom: 24,
  },
  frameWrap: { width: FRAME_W, height: FRAME_H },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#F5F0E8',
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 12 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 12 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 12 },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
    width: FRAME_W,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,240,232,0.4)',
    backgroundColor: 'rgba(245,240,232,0.08)',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: { color: '#F5F0E8', fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    minHeight: 44,
    justifyContent: 'center',
  },
  confirmText: { color: '#000', fontSize: 14, fontWeight: '700' },
});
