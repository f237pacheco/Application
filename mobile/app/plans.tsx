import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';
import {
  PLANS,
  getMonthlyEquivalent,
  type PlanId,
  type Billing,
} from '@/lib/plans';
import { clsx } from 'clsx';

type AccountType = 'individual' | 'professional';

export default function PlansScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  useAuth();
  const params = useLocalSearchParams<{ service?: string; prompt?: string }>();

  const [billing, setBilling] = useState<Billing>('monthly');
  const accountType: AccountType = 'individual';
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPlan = (planId: PlanId) => {
    try {
      setLoadingPlan(planId);
      const plan = PLANS.find((p) => p.id === planId)!;
      if (plan.requiresBusinessInfo || (planId === 'pro' && accountType === 'professional')) {
        router.push({ pathname: '/checkout/business-info', params: { plan: planId, billing, ...params } } as never);
        return;
      }
      router.push({ pathname: '/checkout/payment', params: { plan: planId, billing, ...params } } as never);
    } finally {
      setLoadingPlan(null);
    }
  };

  const backHref = params.service ? `/services/${params.service}` : '/(dashboard)/home';

  const planFeatures: Record<PlanId, string[]> = {
    starter: t('plans.starter.features', { returnObjects: true }) as string[],
    pro: t('plans.pro.features', { returnObjects: true }) as string[],
    enterprise: t('plans.enterprise.features', { returnObjects: true }) as string[],
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      <View className="px-5 pt-4 pb-4 border-b border-gray-900">
        <BackButton href={backHref} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}>
        <View className="items-center pt-6 pb-5 gap-1">
          <Text className="text-2xl font-bold text-white">{t('plans.title')}</Text>
          <Text className="text-gray-400 text-sm text-center">{t('plans.subtitle')}</Text>
        </View>

        {/* Billing toggle — badge in fixed-height slot below to prevent shift */}
        <View className="items-center mb-6 gap-2">
          <View className="flex-row items-center gap-3">
            <Text className={billing === 'monthly' ? 'text-white text-sm font-medium' : 'text-gray-500 text-sm'}>
              {t('plans.monthly')}
            </Text>
            <TouchableOpacity
              onPress={() => setBilling((b) => b === 'monthly' ? 'annual' : 'monthly')}
              activeOpacity={0.8}
              style={{ width: 48, height: 26, position: 'relative' }}
            >
              <View
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: billing === 'annual' ? '#6C5CE7' : '#374151',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 5,
                  left: billing === 'annual' ? 28 : 4,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: 'white',
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              />
            </TouchableOpacity>
            <Text className={billing === 'annual' ? 'text-white text-sm font-medium' : 'text-gray-500 text-sm'}>
              {t('plans.annual')}
            </Text>
          </View>
          {/* Fixed-height slot — prevents toggle from shifting */}
          <View style={{ height: 24, justifyContent: 'center' }}>
            {billing === 'annual' && (
              <View className="bg-success-DEFAULT/20 border border-success-DEFAULT/30 rounded-full px-2 py-0.5">
                <Text className="text-success-DEFAULT text-xs font-bold">{t('plans.annualDiscount')}</Text>
              </View>
            )}
          </View>
        </View>

        {error && (
          <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          </View>
        )}

        <View className="gap-4">
          {PLANS.map((plan) => {
            const price = billing === 'monthly' ? plan.prices[accountType] : getMonthlyEquivalent(plan, accountType);
            const isLoading = loadingPlan === plan.id;
            const features = planFeatures[plan.id];

            return (
              <View
                key={plan.id}
                className={['rounded-2xl border p-5 gap-4', plan.recommended ? 'border-primary-500' : 'border-gray-800 bg-gray-900'].join(' ')}
                style={plan.recommended ? { backgroundColor: '#6C5CE711' } : {}}
              >
                {plan.recommended && (
                  <View className="absolute -top-3 self-center bg-primary-500 rounded-full px-3 py-1">
                    <Text className="text-white text-xs font-bold">{t('plans.recommended')}</Text>
                  </View>
                )}

                <View className="flex-row items-end justify-between">
                  <View>
                    <Text className="text-white text-lg font-bold">{t(`plans.${plan.id}.name`)}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{t(`plans.${plan.id}.tagline`)}</Text>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-end gap-0.5">
                      <Text className="text-white text-3xl font-extrabold">{price}€</Text>
                      <Text className="text-gray-500 text-xs mb-1">{t('plans.perMonth')}</Text>
                    </View>
                    {billing === 'annual' && (
                      <Text className="text-gray-600 text-xs">soit {price * 12}€/an</Text>
                    )}
                  </View>
                </View>

                <View className="gap-2">
                  {features.map((feature, i) => (
                    <View key={i} className="flex-row items-start gap-2">
                      <Text className="text-success-DEFAULT text-sm mt-0.5">✓</Text>
                      <Text className="text-gray-300 text-sm flex-1">{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => handleSelectPlan(plan.id)}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  className={['rounded-xl py-3.5 items-center justify-center', plan.recommended ? 'bg-primary-500' : 'border border-gray-600'].join(' ')}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className={['text-base font-semibold', plan.recommended ? 'text-white' : 'text-gray-300'].join(' ')}>
                      {t('plans.tryFree')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <Text className="text-center text-xs text-gray-600 mt-6">
          {t('payment.freeTrialNotice')} — {t('payment.secure')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
