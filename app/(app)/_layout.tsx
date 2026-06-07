import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(main)" />
      <Stack.Screen name="add-book" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-book" options={{ presentation: 'modal' }} />
      <Stack.Screen name="reading-mode" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="share-book" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
