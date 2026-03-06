import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/hooks/useApp.js';
import { C } from '../src/lib/constants.js';

export default function Index() {
  const { ready, profile } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (profile) {
      router.replace('/(tabs)/body');
    } else {
      router.replace('/onboarding');
    }
  }, [ready, profile]);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.terra} size="large" />
    </View>
  );
}
