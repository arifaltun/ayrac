import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@ayrac_has_entered').then((v) => {
      setTarget(v === 'true' ? '/(app)/(main)/library' : '/splash');
    });
  }, []);

  if (!target) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return <Redirect href={target as any} />;
}
