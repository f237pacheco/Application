import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import i18n, { initI18n } from '@/lib/i18n/client';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const lang = await AsyncStorage.getItem('velona_language');
      await initI18n(lang);
      setReady(true);
    };
    init();
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-950">
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
