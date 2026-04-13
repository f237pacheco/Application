import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';

export default function IndexScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const navigate = async () => {
      if (user) {
        router.replace('/(dashboard)/home');
        return;
      }
      const lang = await AsyncStorage.getItem('velona_language');
      if (!lang) {
        router.replace('/language');
        return;
      }
      const onboarded = await AsyncStorage.getItem('velona_onboarded');
      if (!onboarded) {
        router.replace('/onboarding');
        return;
      }
      router.replace('/(auth)/login');
    };

    navigate();
  }, [user, loading]);

  return (
    <View className="flex-1 items-center justify-center bg-gray-950">
      <ActivityIndicator size="large" color="#6C5CE7" />
    </View>
  );
}
