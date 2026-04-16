import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
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

interface UsageSummary {
  usage: Record<string, number>;
  limit: number | null;
  planKey: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  starter_individual: 'Starter',
  starter_professional: 'Starter Pro',
  pro_individual: 'Pro',
  pro_professional: 'Pro',
  enterprise: 'Enterprise',
};

function usageColor(used: number, limit: number): string {
  const pct = (used / limit) * 100;
  if (pct >= 90) return '#EF4444';
  if (pct >= 70) return '#F59E0B';
  return '#00B894';
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [limitWarningDismissed, setLimitWarningDismissed] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    const headers = { Authorization: `Bearer ${session.access_token}` };

    fetch(`${apiUrl}/api/auth/profile`, { headers })
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => null);

    fetch(`${apiUrl}/api/services/usage/summary`, { headers })
      .then((r) => r.json())
      .then((data) => setUsage(data))
      .catch(() => null);
  }, [session]);

  const firstName =
    profile?.first_name ??
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    'vous';

  const hasPlan = !!profile?.plan_key;
  const isEnterprise = profile?.plan_key === 'enterprise';
  const isStarter = profile?.plan_key?.startsWith('starter');

  const isNearLimit =
    !isEnterprise &&
    usage?.limit != null &&
    SERVICES.some((s) => (usage.usage[s.id] ?? 0) / usage.limit! >= 0.8);

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-900">
        <Logo size="sm" />
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-2xl font-bold text-white">
            {t('home.welcome', { name: firstName })}
          </Text>
          <Text className="text-gray-400 text-sm mt-1">{t('home.services')}</Text>
        </View>

        {/* Limit warning */}
        {isNearLimit && !limitWarningDismissed && (
          <View className="mx-4 mb-3 flex-row items-start justify-between gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3">
            <View className="flex-1">
              <Text className="text-yellow-400 text-sm font-semibold">⚠️ {t('dashboard.limitWarning')}</Text>
              <TouchableOpacity onPress={() => router.push('/plans' as never)}>
                <Text className="text-yellow-300 text-xs mt-0.5 underline">{t('dashboard.upgradePlan')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setLimitWarningDismissed(true)}>
              <Text className="text-yellow-600 text-base">×</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Usage summary */}
        {hasPlan && !isEnterprise && usage && usage.limit != null && (
          <View className="mx-4 mb-4 bg-gray-900 border border-gray-800 rounded-2xl p-4 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-sm font-semibold">{t('dashboard.usageThisMonth')}</Text>
              <Text className="text-gray-500 text-xs">Réinitialisé le 1er</Text>
            </View>
            <View className="gap-2.5">
              {SERVICES.map((s) => {
                const used = usage.usage[s.id] ?? 0;
                const limit = usage.limit!;
                const pct = Math.min((used / limit) * 100, 100);
                const color = usageColor(used, limit);
                return (
                  <View key={s.id} className="gap-1">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-base">{s.icon}</Text>
                        <Text className="text-gray-400 text-xs" numberOfLines={1}>{t(`${s.i18nKey}.name`)}</Text>
                      </View>
                      <Text className="text-gray-500 text-xs">{used}/{limit}</Text>
                    </View>
                    <View className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
                {usage && usage.limit != null && (
                  <Text className="text-xs" style={{ color: service.accentColor }}>
                    {usage.usage[service.id] ?? 0}/{usage.limit} utilisations
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upgrade CTA */}
        {(isStarter || !hasPlan) && (
          <View className="mx-4 mt-4 p-4 rounded-2xl border border-dashed border-gray-700 bg-gray-900/50">
            <Text className="text-white text-sm font-medium">{t('dashboard.addService')}</Text>
            <Text className="text-gray-500 text-xs mt-0.5 mb-3">{t('dashboard.upgradePlan')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/plans' as never)}
              className="rounded-xl py-2.5 items-center"
              style={{ backgroundColor: '#6C5CE7' }}
            >
              <Text className="text-white text-sm font-semibold">Passer au Pro →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
