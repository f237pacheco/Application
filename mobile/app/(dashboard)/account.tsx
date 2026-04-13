import { View, Text, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function AccountScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <View className="flex-1 items-center justify-center">
        <Text className="text-white text-xl font-semibold">{t('dashboard.account')}</Text>
        <Text className="text-gray-500 text-sm mt-2">Phase 5 à venir</Text>
      </View>
    </SafeAreaView>
  );
}
