import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { ServiceMockup } from '@/components/screens/ServiceMockup';
import { getService, type ServiceId } from '@/lib/services';

export default function ServiceDetailScreen() {
  const { service: serviceParam } = useLocalSearchParams<{ service: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const serviceId = serviceParam as ServiceId;
  const service = getService(serviceId);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');

  if (!service) {
    router.replace('/(dashboard)/home');
    return null;
  }

  const handleContinue = () => {
    if (prompt.trim().length < 10) {
      setError(t('auth.errors.required'));
      return;
    }
    router.push({
      pathname: '/plans',
      params: { service: serviceId, prompt: prompt.trim() },
    } as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-5 pt-4 border-b border-gray-900 pb-4">
          <BackButton href="/(dashboard)/home" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {/* Service hero card */}
          <View
            className="rounded-2xl border border-gray-800 overflow-hidden mb-6"
            style={{ backgroundColor: `${service.color}11` }}
          >
            {/* Mockup */}
            <View className="h-36 p-3">
              <ServiceMockup serviceId={service.id} accentColor={service.accentColor} />
            </View>

            {/* Info */}
            <View className="px-5 pb-5 pt-2 flex-row items-start gap-3">
              <Text className="text-4xl">{service.icon}</Text>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">
                  {t(`${service.i18nKey}.name`)}
                </Text>
                <Text className="text-gray-300 text-sm mt-1 leading-relaxed">
                  {t(`${service.i18nKey}.description`)}
                </Text>
              </View>
            </View>
          </View>

          {/* Prompt */}
          <View className="gap-3 mb-6">
            <Text className="text-white text-base font-semibold">
              {t('services.describe')}
            </Text>

            <View className="relative">
              <TextInput
                value={prompt}
                onChangeText={(text) => { setPrompt(text); setError(''); }}
                placeholder={t(`${service.i18nKey}.placeholder`)}
                placeholderTextColor="#4b5563"
                multiline
                numberOfLines={5}
                maxLength={2000}
                textAlignVertical="top"
                className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white text-sm"
                style={{ minHeight: 120 }}
              />
              <Text className="absolute bottom-3 right-3 text-gray-600 text-xs">
                {prompt.length}/2000
              </Text>
            </View>

            {error && <Text className="text-red-400 text-xs">{error}</Text>}

            {/* Help hint */}
            <View
              className="flex-row items-start gap-2 px-4 py-3 rounded-xl"
              style={{ backgroundColor: `${service.color}11`, borderWidth: 1, borderColor: `${service.color}33` }}
            >
              <Text className="text-base">💡</Text>
              <Text className="text-xs leading-relaxed flex-1" style={{ color: service.accentColor }}>
                {t('services.helpText')}
              </Text>
            </View>
          </View>

          {/* CTA */}
          <Button
            onPress={handleContinue}
            label={t('services.continue')}
            size="lg"
            fullWidth
            disabled={prompt.trim().length < 10}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
