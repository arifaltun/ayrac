import { View } from 'react-native';
import { Slot } from 'expo-router';
import { BottomNav } from '@/components/ui/BottomNav';
import { useTheme } from '@/context/ThemeContext';

export default function MainLayout() {
  const { t } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Slot />
      <BottomNav />
    </View>
  );
}
