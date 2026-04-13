import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { PLANS, getPrice, toPlanKey, type PlanId, type Billing } from '@/lib/plans';
import { clsx } from 'clsx';

type PaymentMethod = 'stripe' | 'paypal';
type AccountType = 'individual' | 'professional';

export default function PaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ plan: string; billing: string; service?: string }>();
  const { session } = useAuth();

  const planId = (params.plan ?? 'starter') as PlanId;
  const billing = (params.billing ?? 'monthly') as Billing;
  const accountType: AccountType = 'individual';

  const plan = PLANS.find((p) => p.id === planId);
  const price = plan ? getPrice(plan, accountType, billing) : 0;
  const planKey = toPlanKey(planId, accountType);

  const [method, setMethod] = useState<PaymentMethod>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

  const handlePay = async () => {
    try {
      setLoading(true);
      setError(null);

      if (method === 'stripe') {
        const res = await fetch(`${apiUrl}/api/payments/create-checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            planKey,
            billing,
            successUrl: `velona://checkout/success?plan=${planId}`,
            cancelUrl: `velona://checkout/cancel`,
          }),
        });

        if (!res.ok) throw new Error('Checkout failed');
        const { url } = await res.json();
        await WebBrowser.openBrowserAsync(url);
        // After returning, navigate to dashboard
        router.replace('/(dashboard)/home');
      } else {
        const res = await fetch(`${apiUrl}/api/payments/create-paypal-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            planKey,
            billing,
            successUrl: `velona://checkout/success?plan=${planId}&provider=paypal`,
            cancelUrl: `velona://checkout/cancel`,
          }),
        });

        if (!res.ok) throw new Error('PayPal failed');
        const { approveUrl } = await res.json();
        await WebBrowser.openBrowserAsync(approveUrl);
        router.replace('/(dashboard)/home');
      }
    } catch {
      setError(t('payment.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!plan) {
    router.replace('/plans');
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      <View className="px-5 pt-4 border-b border-gray-900 pb-4">
        <BackButton />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        <Text className="text-2xl font-bold text-white text-center mb-5">
          {t('payment.title')}
        </Text>

        {/* Free trial notice */}
        <View className="bg-success-DEFAULT/10 border border-success-DEFAULT/30 rounded-2xl px-4 py-4 flex-row items-center gap-3 mb-4">
          <Text className="text-2xl">🎁</Text>
          <View className="flex-1">
            <Text className="text-success-DEFAULT text-sm font-bold">{t('payment.freeTrialNotice')}</Text>
            <Text className="text-gray-400 text-xs mt-0.5">Annulez à tout moment pendant l'essai.</Text>
          </View>
        </View>

        {/* Plan summary */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 flex-row items-center justify-between mb-5">
          <View>
            <Text className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">Plan sélectionné</Text>
            <Text className="text-white font-semibold">{t(`plans.${planId}.name`)} · {billing === 'monthly' ? t('plans.monthly') : t('plans.annual')}</Text>
          </View>
          <View className="items-end">
            <Text className="text-white text-2xl font-extrabold">{price}€</Text>
            <Text className="text-gray-500 text-xs">{t('plans.perMonth')}</Text>
          </View>
        </View>

        {/* Payment method */}
        <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 gap-4">
          {error && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <Text className="text-red-400 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Stripe */}
          <TouchableOpacity
            onPress={() => setMethod('stripe')}
            activeOpacity={0.75}
            className={[
              'flex-row items-center gap-4 p-4 rounded-xl border',
              method === 'stripe' ? 'border-primary-500' : 'border-gray-700 bg-gray-800',
            ].join(' ')}
            style={method === 'stripe' ? { backgroundColor: '#6C5CE711' } : {}}
          >
            <View className={[
              'w-5 h-5 rounded-full border-2 items-center justify-center',
              method === 'stripe' ? 'border-primary-500' : 'border-gray-600',
            ].join(' ')}>
              {method === 'stripe' && <View className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-semibold">{t('payment.payWithCard')}</Text>
              <View className="flex-row gap-1.5 mt-1">
                {['VISA', 'MC', 'AMEX'].map((b) => (
                  <View key={b} className="bg-gray-700 rounded px-1.5 py-0.5">
                    <Text className="text-gray-300 text-xs font-bold">{b}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text className="text-gray-400 text-sm font-bold">stripe</Text>
          </TouchableOpacity>

          {/* OR */}
          <View className="flex-row items-center gap-3">
            <View className="flex-1 h-px bg-gray-800" />
            <Text className="text-gray-600 text-xs font-medium">OU</Text>
            <View className="flex-1 h-px bg-gray-800" />
          </View>

          {/* PayPal */}
          <TouchableOpacity
            onPress={() => setMethod('paypal')}
            activeOpacity={0.75}
            className={[
              'flex-row items-center gap-4 p-4 rounded-xl border',
              method === 'paypal' ? 'border-blue-700' : 'border-gray-700 bg-gray-800',
            ].join(' ')}
            style={method === 'paypal' ? { backgroundColor: '#003087' + '15' } : {}}
          >
            <View className={[
              'w-5 h-5 rounded-full border-2 items-center justify-center',
              method === 'paypal' ? 'border-blue-500' : 'border-gray-600',
            ].join(' ')}>
              {method === 'paypal' && <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-semibold">{t('payment.payWithPaypal')}</Text>
              <Text className="text-gray-500 text-xs mt-0.5">Via votre compte PayPal</Text>
            </View>
            <View className="flex-row">
              <Text style={{ color: '#003087', fontWeight: '800', fontSize: 14 }}>Pay</Text>
              <Text style={{ color: '#009cde', fontWeight: '800', fontSize: 14 }}>Pal</Text>
            </View>
          </TouchableOpacity>

          {/* Pay CTA */}
          <TouchableOpacity
            onPress={handlePay}
            disabled={loading}
            activeOpacity={0.85}
            className={[
              'rounded-xl py-4 items-center justify-center',
              method === 'paypal' ? '' : 'bg-primary-500',
            ].join(' ')}
            style={method === 'paypal' ? { backgroundColor: '#FFB800' } : {}}
          >
            {loading ? (
              <ActivityIndicator size="small" color={method === 'paypal' ? '#111' : '#fff'} />
            ) : (
              <Text
                className="text-lg font-semibold"
                style={{ color: method === 'paypal' ? '#111111' : '#ffffff' }}
              >
                {method === 'stripe' ? t('payment.payWithCard') : t('payment.payWithPaypal')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Security */}
        <Text className="text-center text-xs text-gray-600 mt-4">
          🔒 {t('payment.secure')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
