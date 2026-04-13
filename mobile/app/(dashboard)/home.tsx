import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { ServiceMockup } from '@/components/screens/ServiceMockup';
import { SERVICES } from '@/lib/services';

interface Profile {
  first_name: string;
  account_type: string;
  plan_key?: string;
}

const PLAN_LABELS: Record<string, string> = {
  starter_individual: 'Starter',
  starter_professional: 'Starter Pro',
  pro_individual: 'Pro',
  pro_professional: 'Pro',
  enterprise: 'Enterprise',
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, session, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    fetch(`${apiUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => null)
      .finally(() => setLoadingProfile(false));
  }, [session]);

  const firstName =
    profile?.first_name ??
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    'vous';

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-900">
        <Logo size="sm" />
        <View className="flex-row items-center gap-3">
          {profile?.plan_key ? (
            <View className="bg-primary-500/20 border border-primary-500/30 rounded-full px-3 py-1">
              <Text className="text-primary-300 text-xs font-semibold">
                {PLAN_LABELS[profile.plan_key] ?? profile.plan_key}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/plans' as never)}
              className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1"
            >
              <Text className="text-gray-300 text-xs font-medium">
                {t('dashboard.upgradePlan')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Hero */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-2xl font-bold text-white">
            {t('home.welcome', { name: firstName })}
          </Text>
          <Text className="text-gray-400 text-sm mt-1">{t('home.services')}</Text>
        </View>

        {/* Services grid (2 columns) */}
        <View className="px-4 flex-row flex-wrap gap-3">
          {SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              onPress={() => router.push(`/services/${service.id}` as never)}
              activeOpacity={0.8}
              className="rounded-2xl border border-gray-800 overflow-hidden"
              style={{ width: '47.5%' }}
            >
              {/* Mockup */}
              <View className="h-28 p-2.5">
                <ServiceMockup serviceId={service.id} accentColor={service.accentColor} />
              </View>

              {/* Info */}
              <View className="px-3 pb-3 pt-1 gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-lg">{service.icon}</Text>
                  <Text className="text-white text-xs font-semibold flex-1" numberOfLines={1}>
                    {t(`${service.i18nKey}.name`)}
                  </Text>
                </View>
                <Text className="text-gray-500 text-xs" numberOfLines={2}>
                  {t(`${service.i18nKey}.description`)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upgrade CTA for starter */}
        {profile?.plan_key?.startsWith('starter') && (
          <View className="mx-4 mt-4 p-4 rounded-2xl border border-dashed border-gray-700 bg-gray-900/50">
            <Text className="text-white text-sm font-medium">{t('dashboard.addService')}</Text>
            <Text className="text-gray-500 text-xs mt-0.5 mb-3">{t('dashboard.upgradePlan')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/plans' as never)}
              className="bg-primary-500 rounded-xl py-2.5 items-center"
            >
              <Text className="text-white text-sm font-semibold">Passer au Pro</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
