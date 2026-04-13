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
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function BusinessInfoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    plan: string;
    billing: string;
    service?: string;
    prompt?: string;
  }>();
  const { session } = useAuth();

  const [siret, setSiret] = useState('');
  const [vat, setVat] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!siret.trim()) e.siret = t('auth.errors.required');
    if (siret.trim() && siret.replace(/\D/g, '').length !== 14) {
      e.siret = '14 chiffres requis';
    }
    if (!address.trim()) e.address = t('auth.errors.required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          siret: siret.replace(/\D/g, ''),
          vatNumber: vat.trim() || undefined,
          billingAddress: address.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      router.push({
        pathname: '/checkout/payment',
        params: { ...params, siret, vat, address },
      } as never);
    } catch {
      setErrors({ form: t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="px-5 pt-4 border-b border-gray-900 pb-4">
          <BackButton />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* Info banner */}
          <View className="bg-primary-500/10 border border-primary-500/30 rounded-2xl px-4 py-4 mb-6 flex-row items-start gap-3">
            <Text className="text-xl">🏢</Text>
            <View className="flex-1">
              <Text className="text-primary-300 text-sm font-semibold mb-0.5">
                {t('businessInfo.title')}
              </Text>
              <Text className="text-gray-400 text-xs leading-relaxed">
                {t('businessInfo.subtitle')}
              </Text>
            </View>
          </View>

          <View className="bg-gray-900 rounded-3xl border border-gray-800 p-6 gap-5">
            {errors.form && (
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <Text className="text-red-400 text-sm text-center">{errors.form}</Text>
              </View>
            )}

            <Input
              label={`${t('businessInfo.siret')} *`}
              value={siret}
              onChangeText={(v) => { setSiret(v.replace(/\D/g, '').slice(0, 14)); setErrors((e) => ({ ...e, siret: '' })); }}
              placeholder="12345678901234"
              error={errors.siret}
              keyboardType="numeric"
              maxLength={14}
            />

            <Input
              label={`${t('businessInfo.vat')} (optionnel)`}
              value={vat}
              onChangeText={setVat}
              placeholder="FR12345678901"
              autoCapitalize="characters"
            />

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-gray-200">
                {t('businessInfo.billingAddress')} *
              </Text>
              <TextInput
                value={address}
                onChangeText={(v) => { setAddress(v); setErrors((e) => ({ ...e, address: '' })); }}
                placeholder={`12 rue de la Paix\n75001 Paris\nFrance`}
                placeholderTextColor="#4b5563"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm"
                style={{ minHeight: 80 }}
              />
              {errors.address && <Text className="text-xs text-red-400">{errors.address}</Text>}
            </View>

            <Button
              onPress={handleContinue}
              label={t('businessInfo.continue')}
              size="lg"
              fullWidth
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
