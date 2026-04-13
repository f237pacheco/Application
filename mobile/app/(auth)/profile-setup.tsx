import { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

const SECTORS = [
  'Restauration', 'Commerce', 'Services', 'Santé', 'Immobilier',
  'Tech', 'Marketing', 'Juridique', 'Finance', 'Éducation', 'Autre',
];

type AccountType = 'individual' | 'professional';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = t('auth.errors.required');
    if (accountType === 'professional' && !companyName.trim()) {
      e.companyName = t('auth.errors.required');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
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
          firstName: firstName.trim(),
          accountType,
          companyName: companyName.trim() || undefined,
          sector: sector || undefined,
        }),
      });

      if (!res.ok) throw new Error('Profile save failed');
      router.replace('/(dashboard)/home');
    } catch {
      setErrors({ form: t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="px-5 pt-4">
            <BackButton href="/(auth)/login" />
          </View>

          {/* Content */}
          <View className="flex-1 items-center justify-center px-6 py-8">
            <Logo size="md" />

            <View className="w-full mt-8 bg-gray-900 rounded-3xl border border-gray-800 p-6 gap-5">
              <Text className="text-2xl font-bold text-white text-center">
                {t('auth.title')}
              </Text>

              {/* Error */}
              {errors.form && (
                <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <Text className="text-red-400 text-sm text-center">{errors.form}</Text>
                </View>
              )}

              {/* First name */}
              <Input
                label={t('auth.firstName')}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Jean"
                error={errors.firstName}
                autoFocus
                autoCapitalize="words"
              />

              {/* Account type */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-gray-200">
                  {t('auth.accountType')}
                </Text>
                <View className="flex-row gap-3">
                  {(['individual', 'professional'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setAccountType(type)}
                      activeOpacity={0.75}
                      className={[
                        'flex-1 py-3 px-4 rounded-xl border',
                        accountType === type
                          ? 'bg-primary-500/20 border-primary-500'
                          : 'bg-gray-800 border-gray-700',
                      ].join(' ')}
                    >
                      <Text
                        className={[
                          'text-sm font-medium text-center',
                          accountType === type ? 'text-primary-300' : 'text-gray-400',
                        ].join(' ')}
                      >
                        {t(`auth.${type}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Professional fields */}
              {accountType === 'professional' && (
                <>
                  <Input
                    label={t('auth.companyName')}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Mon Entreprise SAS"
                    error={errors.companyName}
                    autoCapitalize="words"
                  />

                  {/* Sector selector */}
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-gray-200">
                      {t('auth.sector')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                    >
                      {SECTORS.map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => setSector(s)}
                          activeOpacity={0.75}
                          className={[
                            'px-4 py-2 rounded-full border',
                            sector === s
                              ? 'bg-primary-500/20 border-primary-500'
                              : 'bg-gray-800 border-gray-700',
                          ].join(' ')}
                        >
                          <Text
                            className={[
                              'text-sm font-medium',
                              sector === s ? 'text-primary-300' : 'text-gray-400',
                            ].join(' ')}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              {/* Submit */}
              <Button
                onPress={handleSubmit}
                label={t('auth.continue')}
                size="lg"
                fullWidth
                loading={loading}
              />

              <Text className="text-xs text-gray-600 text-center leading-relaxed">
                {t('auth.terms')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
