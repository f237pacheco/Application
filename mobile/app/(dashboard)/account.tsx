import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { locales, localeNames, localeFlags, type Locale } from '@/lib/i18n/config';
import i18n from '@/lib/i18n/client';

interface Profile {
  first_name: string;
  email: string;
  account_type?: string;
  company_name?: string;
  sector?: string;
  plan_key?: string;
  promo_code?: string;
}

const PLAN_LABELS: Record<string, string> = {
  starter_individual: 'Starter — Particulier',
  starter_professional: 'Starter — Professionnel',
  pro_individual: 'Pro — Particulier',
  pro_professional: 'Pro — Professionnel',
  enterprise: 'Enterprise',
};

export default function AccountScreen() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState<Locale>('fr');

  const [partnerUrl, setPartnerUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    setCurrentLang((i18n.language?.slice(0, 2) ?? 'fr') as Locale);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [session]);

  const handleLanguageChange = async (locale: Locale) => {
    await i18n.changeLanguage(locale);
    await AsyncStorage.setItem('velona_language', locale);
    setCurrentLang(locale);
  };

  const handleBillingPortal = async () => {
    try {
      setBillingLoading(true);
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/payments/create-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ returnUrl: 'velona://account' }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setBillingLoading(false);
    }
  };

  const handlePartnerSubmit = async () => {
    if (!partnerUrl.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/partner/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ url: partnerUrl.trim() }),
      });
      setSubmitStatus(res.ok ? 'success' : 'error');
      if (res.ok) setPartnerUrl('');
    } catch {
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const initial = profile?.first_name?.charAt(0).toUpperCase() ?? '?';

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <StatusBar barStyle="light-content" backgroundColor="#030712" />
        <View className="flex-1 gap-3 px-4 pt-4">
          {[...Array(3)].map((_, i) => (
            <View key={i} className="h-32 rounded-2xl bg-gray-900 border border-gray-800" />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Header */}
      <View className="px-5 py-4 border-b border-gray-900">
        <Text className="text-xl font-bold text-white">{t('dashboard.account')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="gap-4">

          {/* Profile card */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profil</Text>

            <View className="flex-row items-center gap-4">
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: '#6C5CE733', borderWidth: 1, borderColor: '#6C5CE750' }}
              >
                <Text className="text-2xl font-bold" style={{ color: '#B4A9F5' }}>{initial}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-bold">{profile?.first_name}</Text>
                <Text className="text-gray-400 text-xs mt-0.5">{profile?.email}</Text>
                {profile?.company_name && (
                  <Text className="text-gray-500 text-xs mt-0.5">🏢 {profile.company_name}</Text>
                )}
              </View>
            </View>

            {profile?.account_type && (
              <View className="flex-row gap-2 flex-wrap">
                <View className="bg-gray-800 rounded-full px-2.5 py-1">
                  <Text className="text-gray-400 text-xs">
                    {profile.account_type === 'individual' ? 'Particulier' : 'Professionnel'}
                  </Text>
                </View>
                {profile.sector && (
                  <View className="bg-gray-800 rounded-full px-2.5 py-1">
                    <Text className="text-gray-400 text-xs">{profile.sector}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Subscription card */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Abonnement</Text>

            {profile?.plan_key ? (
              <>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white font-semibold">
                      {PLAN_LABELS[profile.plan_key] ?? profile.plan_key}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-0.5">Abonnement actif</Text>
                  </View>
                  <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#00B894' }} />
                </View>
                <Button
                  onPress={handleBillingPortal}
                  label="Gérer l'abonnement →"
                  variant="outline"
                  size="sm"
                  loading={billingLoading}
                />
              </>
            ) : (
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-400 text-sm">Aucun abonnement actif</Text>
                <TouchableOpacity>
                  <Text className="text-primary-400 text-sm font-semibold">Choisir un plan →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Language */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Langue</Text>
            <View className="flex-row flex-wrap gap-2">
              {locales.map((locale) => {
                const isActive = currentLang === locale;
                return (
                  <TouchableOpacity
                    key={locale}
                    onPress={() => handleLanguageChange(locale)}
                    activeOpacity={0.7}
                    className="items-center gap-1 p-2.5 rounded-xl border"
                    style={{
                      width: '18%',
                      borderColor: isActive ? '#6C5CE7' : '#374151',
                      backgroundColor: isActive ? '#6C5CE720' : '#1F2937',
                    }}
                  >
                    <Text className="text-2xl">{localeFlags[locale]}</Text>
                    <Text
                      className="text-xs"
                      style={{ color: isActive ? '#B4A9F5' : '#6B7280' }}
                      numberOfLines={1}
                    >
                      {localeNames[locale]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Partner programme */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-4">
            <View>
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {t('partner.title')}
              </Text>
              <Text className="text-gray-500 text-xs">{t('partner.description')}</Text>
            </View>

            {profile?.promo_code && (
              <View
                className="rounded-xl p-4 flex-row items-center justify-between gap-3"
                style={{ backgroundColor: '#6C5CE720', borderWidth: 1, borderColor: '#6C5CE740' }}
              >
                <View>
                  <Text className="text-gray-400 text-xs mb-0.5">{t('partner.yourCode')}</Text>
                  <Text className="text-xl font-bold tracking-widest" style={{ color: '#B4A9F5', fontFamily: 'monospace' }}>
                    {profile.promo_code}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    const Clipboard = await import('expo-clipboard');
                    await Clipboard.setStringAsync(profile.promo_code!);
                  }}
                  className="border border-gray-700 px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-gray-400 text-xs">Copier</Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="gap-2">
              <Text className="text-sm font-medium text-gray-200">{t('partner.submitLink')}</Text>
              <TextInput
                value={partnerUrl}
                onChangeText={(v) => { setPartnerUrl(v); setSubmitStatus('idle'); }}
                placeholder={t('partner.linkPlaceholder')}
                placeholderTextColor="#4B5563"
                keyboardType="url"
                autoCapitalize="none"
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm"
              />
              <Button
                onPress={handlePartnerSubmit}
                label={t('partner.submit')}
                size="sm"
                loading={submitting}
                disabled={!partnerUrl.trim()}
              />
              {submitStatus === 'success' && (
                <Text className="text-xs" style={{ color: '#00B894' }}>✓ Lien soumis ! Validation sous 24-48h.</Text>
              )}
              {submitStatus === 'error' && (
                <Text className="text-xs text-red-400">Erreur, vérifiez l'URL ou réessayez.</Text>
              )}
            </View>
          </View>

          {/* Sign out */}
          <View
            className="rounded-2xl p-5 flex-row items-center justify-between gap-4"
            style={{ borderWidth: 1, borderColor: '#EF444430' }}
          >
            <View>
              <Text className="text-white text-sm font-semibold">Déconnexion</Text>
              <Text className="text-gray-500 text-xs mt-0.5">Vous serez redirigé vers l'écran de connexion</Text>
            </View>
            <TouchableOpacity
              onPress={() => signOut()}
              className="border rounded-xl px-4 py-2"
              style={{ borderColor: '#EF444460' }}
            >
              <Text className="text-red-400 text-sm font-medium">Se déconnecter</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
