import { View, Text, SafeAreaView, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function CheckoutSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { plan } = useLocalSearchParams<{ plan?: string }>();

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      <View className="flex-1 items-center justify-center px-6 gap-7">
        <Logo size="md" />

        {/* Success icon */}
        <View className="w-28 h-28 rounded-full bg-success-DEFAULT/20 border-2 border-success-DEFAULT/40 items-center justify-center">
          <Text className="text-5xl">✅</Text>
        </View>

        <View className="items-center gap-2">
          <Text className="text-3xl font-bold text-white text-center">
            Bienvenue dans Velona !
          </Text>
          <Text className="text-gray-400 text-sm text-center leading-relaxed">
            Votre essai gratuit de 3 jours commence maintenant. Vous ne serez débité qu'après la période d'essai.
          </Text>
        </View>

        {plan && (
          <View className="bg-primary-500/20 border border-primary-500/30 rounded-full px-4 py-2 flex-row items-center gap-2">
            <Text className="text-base">✨</Text>
            <Text className="text-primary-300 text-sm font-semibold">
              Plan {plan.charAt(0).toUpperCase() + plan.slice(1)} activé
            </Text>
          </View>
        )}

        {/* Free trial reminder */}
        <View className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 flex-row items-start gap-3">
          <Text className="text-xl">📅</Text>
          <View className="flex-1">
            <Text className="text-white text-sm font-semibold mb-0.5">Rappel essai gratuit</Text>
            <Text className="text-gray-400 text-xs leading-relaxed">
              Votre carte ne sera pas débitée pendant 3 jours. Annulez à tout moment depuis votre compte.
            </Text>
          </View>
        </View>

        <Button
          onPress={() => router.replace('/(dashboard)/home')}
          label="Accéder à mon dashboard →"
          size="lg"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
