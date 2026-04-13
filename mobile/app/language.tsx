import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logo } from '@/components/ui/Logo';
import { locales, localeNames, localeFlags, type Locale } from '@/lib/i18n/config';
import i18n from '@/lib/i18n/client';

const NUM_COLUMNS = 3;

export default function LanguageScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleSelectLanguage = async (locale: Locale) => {
    await i18n.changeLanguage(locale);
    await AsyncStorage.setItem('velona_language', locale);
    router.replace('/onboarding');
  };

  const renderItem = ({ item: locale }: { item: Locale }) => (
    <TouchableOpacity
      onPress={() => handleSelectLanguage(locale)}
      activeOpacity={0.75}
      className="flex-1 m-1.5 bg-gray-900 border border-gray-800 rounded-2xl p-4 items-center gap-2"
    >
      <Text className="text-4xl select-none">{localeFlags[locale]}</Text>
      <Text className="text-xs font-medium text-gray-400 text-center">
        {localeNames[locale]}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      <View className="flex-1 px-5">
        {/* Header */}
        <View className="items-center pt-12 pb-10 gap-3">
          <Logo size="xl" />
          <Text className="text-gray-400 text-base text-center px-6">
            {t('language.subtitle')}
          </Text>
        </View>

        {/* Language grid */}
        <FlatList
          data={[...locales]}
          keyExtractor={(item) => item}
          numColumns={NUM_COLUMNS}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />

        {/* Footer */}
        <Text className="text-gray-700 text-xs text-center pb-6">
          Velona © {new Date().getFullYear()}
        </Text>
      </View>
    </SafeAreaView>
  );
}
