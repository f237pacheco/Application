import { View, Text, SafeAreaView, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

// Placeholder — will be fully built in Phase 3 (Screen 4)
export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'utilisateur';

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-white text-center">
          {t('home.welcome', { name: firstName })}
        </Text>
        <Text className="text-gray-500 text-sm mt-3 text-center">
          Dashboard — Phase 3 à venir
        </Text>
      </View>
    </SafeAreaView>
  );
}
